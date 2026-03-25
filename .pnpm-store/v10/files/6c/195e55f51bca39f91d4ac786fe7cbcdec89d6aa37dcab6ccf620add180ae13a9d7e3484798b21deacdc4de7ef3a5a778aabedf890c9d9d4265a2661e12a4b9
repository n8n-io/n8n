'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../../constants/index.js');
var index = require('../../../hooks/use-locale/index.js');
var event = require('../../../constants/event.js');
var error = require('../../../utils/error.js');
var index$1 = require('../../../hooks/use-deprecated/index.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);

const adjacentMonth = (start, end) => {
  const firstMonthLastDay = start.endOf("month");
  const lastMonthFirstDay = end.startOf("month");
  const isSameWeek = firstMonthLastDay.isSame(lastMonthFirstDay, "week");
  const lastMonthStartDay = isSameWeek ? lastMonthFirstDay.add(1, "week") : lastMonthFirstDay;
  return [
    [start, firstMonthLastDay],
    [lastMonthStartDay.startOf("week"), end]
  ];
};
const threeConsecutiveMonth = (start, end) => {
  const firstMonthLastDay = start.endOf("month");
  const secondMonthFirstDay = start.add(1, "month").startOf("month");
  const secondMonthStartDay = firstMonthLastDay.isSame(secondMonthFirstDay, "week") ? secondMonthFirstDay.add(1, "week") : secondMonthFirstDay;
  const secondMonthLastDay = secondMonthStartDay.endOf("month");
  const lastMonthFirstDay = end.startOf("month");
  const lastMonthStartDay = secondMonthLastDay.isSame(lastMonthFirstDay, "week") ? lastMonthFirstDay.add(1, "week") : lastMonthFirstDay;
  return [
    [start, firstMonthLastDay],
    [secondMonthStartDay.startOf("week"), secondMonthLastDay],
    [lastMonthStartDay.startOf("week"), end]
  ];
};
const useCalendar = (props, emit, componentName) => {
  const slots = vue.useSlots();
  const { lang } = index.useLocale();
  const selectedDay = vue.ref();
  const now = dayjs__default["default"]().locale(lang.value);
  const realSelectedDay = vue.computed({
    get() {
      if (!props.modelValue)
        return selectedDay.value;
      return date.value;
    },
    set(val) {
      if (!val)
        return;
      selectedDay.value = val;
      const result = val.toDate();
      emit(event.INPUT_EVENT, result);
      emit(event.UPDATE_MODEL_EVENT, result);
    }
  });
  const validatedRange = vue.computed(() => {
    if (!props.range)
      return [];
    const rangeArrDayjs = props.range.map((_) => dayjs__default["default"](_).locale(lang.value));
    const [startDayjs, endDayjs] = rangeArrDayjs;
    if (startDayjs.isAfter(endDayjs)) {
      error.debugWarn(componentName, "end time should be greater than start time");
      return [];
    }
    if (startDayjs.isSame(endDayjs, "month")) {
      return calculateValidatedDateRange(startDayjs, endDayjs);
    } else {
      if (startDayjs.add(1, "month").month() !== endDayjs.month()) {
        error.debugWarn(componentName, "start time and end time interval must not exceed two months");
        return [];
      }
      return calculateValidatedDateRange(startDayjs, endDayjs);
    }
  });
  const date = vue.computed(() => {
    if (!props.modelValue) {
      return realSelectedDay.value || (validatedRange.value.length ? validatedRange.value[0][0] : now);
    } else {
      return dayjs__default["default"](props.modelValue).locale(lang.value);
    }
  });
  const prevMonthDayjs = vue.computed(() => date.value.subtract(1, "month").date(1));
  const nextMonthDayjs = vue.computed(() => date.value.add(1, "month").date(1));
  const prevYearDayjs = vue.computed(() => date.value.subtract(1, "year").date(1));
  const nextYearDayjs = vue.computed(() => date.value.add(1, "year").date(1));
  const calculateValidatedDateRange = (startDayjs, endDayjs) => {
    const firstDay = startDayjs.startOf("week");
    const lastDay = endDayjs.endOf("week");
    const firstMonth = firstDay.get("month");
    const lastMonth = lastDay.get("month");
    if (firstMonth === lastMonth) {
      return [[firstDay, lastDay]];
    } else if ((firstMonth + 1) % 12 === lastMonth) {
      return adjacentMonth(firstDay, lastDay);
    } else if (firstMonth + 2 === lastMonth || (firstMonth + 1) % 11 === lastMonth) {
      return threeConsecutiveMonth(firstDay, lastDay);
    } else {
      error.debugWarn(componentName, "start time and end time interval must not exceed two months");
      return [];
    }
  };
  const pickDay = (day) => {
    realSelectedDay.value = day;
  };
  const selectDate = (type) => {
    const dateMap = {
      "prev-month": prevMonthDayjs.value,
      "next-month": nextMonthDayjs.value,
      "prev-year": prevYearDayjs.value,
      "next-year": nextYearDayjs.value,
      today: now
    };
    const day = dateMap[type];
    if (!day.isSame(date.value, "day")) {
      pickDay(day);
    }
  };
  index$1.useDeprecated({
    from: '"dateCell"',
    replacement: '"date-cell"',
    scope: "ElCalendar",
    version: "2.3.0",
    ref: "https://element-plus.org/en-US/component/calendar.html#slots",
    type: "Slot"
  }, vue.computed(() => !!slots.dateCell));
  return {
    calculateValidatedDateRange,
    date,
    realSelectedDay,
    pickDay,
    selectDate,
    validatedRange
  };
};

exports.useCalendar = useCalendar;
//# sourceMappingURL=use-calendar.js.map
