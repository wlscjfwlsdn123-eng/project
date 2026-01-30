// State Management
let currentDate = new Date();
let selectedDate = null;
let events = JSON.parse(localStorage.getItem('myPlannerEvents')) || {};

// Picker State
let selectedStartTime = "09:00";
let selectedEndTime = "10:00";
const ITEM_HEIGHT = 40;
const timeOptions = [];

// DOM Elements
const calendarGrid = document.getElementById('calendarGrid');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

const modal = document.getElementById('dayModal');
const closeModalBtn = document.getElementById('closeModal');
const saveAndCloseBtn = document.getElementById('saveAndCloseBtn');
const modalDateTitle = document.getElementById('modalDateTitle');

const eventTitleInput = document.getElementById('eventTitle');
const isUrgentInput = document.getElementById('isUrgent');
const isImportantInput = document.getElementById('isImportant');
const addEventBtn = document.getElementById('addEventBtn');
const timeTableContainer = document.getElementById('timeTable');

// Picker DOM
const startPickerView = document.getElementById('startPickerView');
const startPickerWheel = document.getElementById('startPickerWheel');
const endPickerView = document.getElementById('endPickerView');
const endPickerWheel = document.getElementById('endPickerWheel');

// Helper Functions
const saveToLocalStorage = () => {
    localStorage.setItem('myPlannerEvents', JSON.stringify(events));
};

// Generate Time Options Array
const generateTimeOptions = () => {
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            timeOptions.push(timeString);
        }
    }
};

const renderPickerItems = (wheelElement, selectedValue) => {
    wheelElement.innerHTML = '';
    timeOptions.forEach(time => {
        const item = document.createElement('div');
        item.classList.add('picker-item');
        item.textContent = time;
        item.dataset.value = time;
        if (time === selectedValue) item.classList.add('active');
        wheelElement.appendChild(item);
    });
};

const updatePickerHighlight = (viewElement, wheelElement, isStart) => {
    const scrollTop = viewElement.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);

    // Boundary check
    if (index < 0 || index >= timeOptions.length) return;

    // Update active class
    const items = wheelElement.querySelectorAll('.picker-item');
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');

    // Update State
    const val = timeOptions[index];
    if (isStart) selectedStartTime = val;
    else selectedEndTime = val;
};

const scrollToTime = (viewElement, time) => {
    const index = timeOptions.indexOf(time);
    if (index !== -1) {
        viewElement.scrollTop = index * ITEM_HEIGHT;
    }
};

const initPickers = () => {
    generateTimeOptions();
    renderPickerItems(startPickerWheel, selectedStartTime);
    renderPickerItems(endPickerWheel, selectedEndTime);

    // Visual Highlight on Scroll (Standard listener for visual feedback)
    const handleScroll = (view, wheel, isStart) => {
        updatePickerHighlight(view, wheel, isStart);
    };

    startPickerView.addEventListener('scroll', () => handleScroll(startPickerView, startPickerWheel, true));
    endPickerView.addEventListener('scroll', () => handleScroll(endPickerView, endPickerWheel, false));

    // DRAG INTERACTION IMPLEMENTATION
    const enableDrag = (view) => {
        let isDown = false;
        let startY;
        let scrollTop;

        view.addEventListener('mousedown', (e) => {
            isDown = true;
            startY = e.pageY - view.offsetTop;
            scrollTop = view.scrollTop;

            // Disable snap during drag for smooth feel
            view.style.scrollSnapType = 'none';
            view.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
        });

        const stopDrag = () => {
            if (!isDown) return;
            isDown = false;
            view.style.scrollSnapType = 'y mandatory'; // Re-enable snap to settle
            view.style.cursor = 'grab';
        };

        view.addEventListener('mouseleave', stopDrag);
        view.addEventListener('mouseup', stopDrag);

        view.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const y = e.pageY - view.offsetTop;
            const walk = (y - startY) * 1.5; // Scroll-fastness multiplier (adjustable)
            view.scrollTop = scrollTop - walk;
        });
    };

    enableDrag(startPickerView);
    enableDrag(endPickerView);
};

const getDurationSlots = (start, end) => {
    if (!end) return 1;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let totalMin = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMin <= 0) return 1;
    return Math.ceil(totalMin / 30);
};

const getEventPriorityClass = (urgent, important) => {
    if (urgent && important) return 'p-high';
    if (urgent) return 'p-urgent';
    if (important) return 'p-important';
    return 'p-normal';
};

const formatKey = (date) => {
    return date.toISOString().split('T')[0];
};

// Calendar Logic
const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentDateDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Previous Month Filler
    for (let i = 0; i < firstDay; i++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell', 'other-month');
        dayCell.textContent = daysInPrevMonth - firstDay + 1 + i;
        calendarGrid.appendChild(dayCell);
    }

    // Current Month Days
    for (let i = 1; i <= daysInMonth; i++) {
        const currentLoopDate = new Date(year, month, i);
        const dateKey = formatKey(currentLoopDate);
        const dayOfWeek = currentLoopDate.getDay(); // 0: Sun, 6: Sat

        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        if (
            i === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear()
        ) {
            dayCell.classList.add('today');
        }

        // HoliDay Logic
        const holidays2026 = [
            { "date": "2026-01-01", "name": "신정" },
            { "date": "2026-02-16", "name": "설날 연휴" },
            { "date": "2026-02-17", "name": "설날" },
            { "date": "2026-02-18", "name": "설날 연휴" },
            { "date": "2026-03-01", "name": "삼일절" },
            { "date": "2026-03-02", "name": "삼일절 대체공휴일" },
            { "date": "2026-05-05", "name": "어린이날" },
            { "date": "2026-05-24", "name": "부처님오신날" },
            { "date": "2026-05-25", "name": "부처님오신날 대체공휴일" },
            { "date": "2026-06-03", "name": "지방선거 (공휴일)" },
            { "date": "2026-06-06", "name": "현충일" },
            { "date": "2026-08-15", "name": "광복절" },
            { "date": "2026-08-17", "name": "광복절 대체공휴일" },
            { "date": "2026-09-24", "name": "추석 연휴" },
            { "date": "2026-09-25", "name": "추석" },
            { "date": "2026-09-26", "name": "추석 연휴" },
            { "date": "2026-10-03", "name": "개천절" },
            { "date": "2026-10-05", "name": "개천절 대체공휴일" },
            { "date": "2026-10-09", "name": "한글날" },
            { "date": "2026-12-25", "name": "성탄절" }
        ];

        const holiday = holidays2026.find(h => h.date === dateKey);

        // Date Number
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('day-number');
        numberDiv.textContent = i;

        // Color Logic
        if (holiday || dayOfWeek === 0) {
            numberDiv.classList.add('text-red');
        } else if (dayOfWeek === 6) {
            numberDiv.classList.add('text-blue');
        }

        dayCell.appendChild(numberDiv);

        // Holiday Name
        if (holiday) {
            const holidayName = document.createElement('div');
            holidayName.className = 'holiday-name';
            holidayName.textContent = holiday.name;
            dayCell.appendChild(holidayName);
        }

        // Render Top 3 Events
        if (events[dateKey]) {
            const sortedEvents = [...events[dateKey]].sort((a, b) => {
                const scoreA = (a.urgent ? 2 : 0) + (a.important ? 1 : 0);
                const scoreB = (b.urgent ? 2 : 0) + (b.important ? 1 : 0);
                if (scoreB !== scoreA) return scoreB - scoreA;
                const timeA = a.startTime || a.time;
                const timeB = b.startTime || b.time;
                return timeA.localeCompare(timeB);
            });

            sortedEvents.slice(0, 3).forEach(evt => {
                const badge = document.createElement('div');
                badge.classList.add('event-preview');
                badge.classList.add(getEventPriorityClass(evt.urgent, evt.important));
                if (evt.completed) badge.classList.add('completed');
                badge.textContent = evt.title;
                dayCell.appendChild(badge);
            });

            if (sortedEvents.length > 3) {
                const more = document.createElement('div');
                more.style.fontSize = '0.7rem';
                more.style.color = '#94a3b8';
                more.style.textAlign = 'center';
                more.textContent = `+ ${sortedEvents.length - 3} more`;
                dayCell.appendChild(more);
            }
        }

        dayCell.addEventListener('click', () => openModal(currentLoopDate));
        calendarGrid.appendChild(dayCell);
    }
};

// Modal Logic
const openModal = (date) => {
    selectedDate = date;
    const dateKey = formatKey(date);
    modalDateTitle.textContent = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    // Clear inputs
    eventTitleInput.value = '';
    isUrgentInput.checked = false;
    isImportantInput.checked = false;

    // Defaults reset
    selectedStartTime = "09:00";
    selectedEndTime = "10:00";

    // Scroll to defaults
    // Small timeout to ensure modal is visible/layout calc works if needed, 
    // but usually okay since we remove hidden class then scroll
    modal.classList.remove('hidden');

    // Set scroll position
    scrollToTime(startPickerView, selectedStartTime);
    scrollToTime(endPickerView, selectedEndTime);

    renderTimeTable(dateKey);
};

const renderTimeTable = (dateKey) => {
    timeTableContainer.innerHTML = '';
    const dayEvents = events[dateKey] || [];

    const eventsMap = {};
    dayEvents.forEach((evt, index) => {
        const start = evt.startTime || evt.time;
        if (!eventsMap[start]) eventsMap[start] = [];
        eventsMap[start].push({ ...evt, startTime: start, originalIndex: index });
    });

    const ROW_HEIGHT = 50;

    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            const row = document.createElement('div');
            row.classList.add('time-slot-row');

            const label = document.createElement('div');
            label.classList.add('time-label');
            label.textContent = timeString;
            row.appendChild(label);

            const content = document.createElement('div');
            content.classList.add('time-content');

            if (eventsMap[timeString]) {
                eventsMap[timeString].forEach((evt, i) => {
                    const durationSlots = getDurationSlots(evt.startTime, evt.endTime);
                    const heightPx = (durationSlots * ROW_HEIGHT) - 4;

                    const eventCard = document.createElement('div');
                    eventCard.classList.add('timeline-event');
                    if (evt.completed) eventCard.classList.add('completed');
                    eventCard.classList.add(getEventPriorityClass(evt.urgent, evt.important));

                    if (i > 0) {
                        eventCard.style.left = `${4 + (i * 15)}px`;
                        eventCard.style.width = `calc(100% - ${14 + (i * 15)}px)`;
                        eventCard.style.zIndex = 10 + i;
                    }

                    eventCard.style.height = `${heightPx}px`;

                    eventCard.innerHTML = `
                        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center;">
                            <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;">
                                ${evt.urgent ? '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>' : ''}
                                ${evt.important ? '<i class="fas fa-star" style="color:#f59e0b;"></i>' : ''}
                                ${evt.title}
                            </div>
                            <div style="font-size:0.75rem; opacity:0.8;">${evt.startTime} ${evt.endTime ? '~ ' + evt.endTime : ''}</div>
                        </div>
                        <div class="event-actions">
                            <div class="check-btn" onclick="toggleComplete('${dateKey}', ${evt.originalIndex}, event)">
                                <i class="fas fa-check"></i>
                            </div>
                            <button class="delete-btn" onclick="removeEvent('${dateKey}', ${evt.originalIndex})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    content.appendChild(eventCard);
                });
            }

            row.appendChild(content);
            timeTableContainer.appendChild(row);
        }
    }
};

const closeModal = () => {
    modal.classList.add('hidden');
    renderCalendar();
};

const addEvent = () => {
    if (!eventTitleInput.value.trim()) {
        alert('일정 제목을 입력해주세요.');
        return;
    }

    // Read from state variables updated by scroll
    const startTime = selectedStartTime;
    const endTime = selectedEndTime;
    const dateKey = formatKey(selectedDate);

    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin) {
        alert('종료 시간은 시작 시간보다 늦어야 합니다.');
        return;
    }

    // Check Overlap
    const dayEvents = events[dateKey] || [];
    const hasOverlap = dayEvents.some(evt => {
        const evtStartMin = toMinutes(evt.startTime || evt.time);
        let evtEndMin;
        if (evt.endTime) {
            evtEndMin = toMinutes(evt.endTime);
        } else {
            evtEndMin = evtStartMin + 30;
        }

        return (startMin < evtEndMin) && (endMin > evtStartMin);
    });

    if (hasOverlap) {
        alert('선택하신 시간에 이미 등록된 일정이 있습니다.\n시간을 조정해주세요.');
        return;
    }

    const newEvent = {
        startTime: startTime,
        endTime: endTime,
        time: startTime, // compat
        title: eventTitleInput.value,
        urgent: isUrgentInput.checked,
        important: isImportantInput.checked,
        completed: false
    };

    if (!events[dateKey]) {
        events[dateKey] = [];
    }

    events[dateKey].push(newEvent);
    saveToLocalStorage();
    renderTimeTable(dateKey);
    renderCalendar();

    eventTitleInput.value = '';
    isUrgentInput.checked = false;
    isImportantInput.checked = false;
};

// Global Functions
window.removeEvent = (dateKey, index) => {
    if (confirm('이 일정을 삭제하시겠습니까?')) {
        events[dateKey].splice(index, 1);
        if (events[dateKey].length === 0) delete events[dateKey];
        saveToLocalStorage();
        renderTimeTable(dateKey);
        renderCalendar();
    }
};

window.toggleComplete = (dateKey, index, e) => {
    e.stopPropagation();
    if (events[dateKey] && events[dateKey][index]) {
        events[dateKey][index].completed = !events[dateKey][index].completed;
        saveToLocalStorage();
        renderTimeTable(dateKey);
    }
};

// Event Listeners
const handleNav = (direction) => {
    const isNext = direction === 'next';
    const outClass = isNext ? 'anim-slide-out-left' : 'anim-slide-out-right';
    const inClass = isNext ? 'anim-slide-in-right' : 'anim-slide-in-left';

    // 1. Slide Out
    calendarGrid.classList.add(outClass);

    setTimeout(() => {
        // 2. Update Date
        if (isNext) currentDate.setMonth(currentDate.getMonth() + 1);
        else currentDate.setMonth(currentDate.getMonth() - 1);

        renderCalendar();

        // 3. Reset & Slide In
        calendarGrid.classList.remove(outClass);
        calendarGrid.classList.add(inClass);

        // 4. Clean up after slide in
        setTimeout(() => {
            calendarGrid.classList.remove(inClass);
        }, 200); // Match CSS duration
    }, 200); // Match CSS duration
};

prevBtn.addEventListener('click', () => handleNav('prev'));
nextBtn.addEventListener('click', () => handleNav('next'));

todayBtn.addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar();
});

closeModalBtn.addEventListener('click', closeModal);
saveAndCloseBtn.addEventListener('click', closeModal);
addEventBtn.addEventListener('click', addEvent);

// Init
initPickers();
renderCalendar();
