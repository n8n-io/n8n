'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dayjs = require('dayjs');
var localeData = require('dayjs/plugin/localeData.js');
require('../../../hooks/index.js');
require('../../time-picker/index.js');
require('../../../constants/index.js');
var dateTable = require('./date-table.js');
var index = require('../../../hooks/use-locale/index.js');
var utils = require('../../time-picker/src/utils.js');
var date = require('../../../constants/date.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var dayjs__default = /*#__PURE__*/_interopDefaultLegacy(dayjs);
var localeData__default = /*#__PURE__*/_interopDefaultLegacy(localeData);

const useDateTable = (props, emit) => {
  dayjs__default["default"].extend(localeData__default["default"]);
  const firstDayOfWeek = dayjs__default["default"].localeData().firstDayOfWeek();
  const { t, lang } = index.useLocale();
  const now = dayjs__default["default"]().locale(lang.value);
  const isInRange = vue.computed(() => !!props.range && !!props.range.length);
  const rows = vue.computed(() => {
    let days = [];
    if (isInRange.value) {
      const [start, end] = props.range;
      const currentMonthRange = utils.rangeArr(end.date() - start.date() + 1).map((index) => ({
        text: start.date() + index,
        type: "current"
      }));
      let remaining = currentMonthRange.length % 7;
      remaining = remaining === 0 ? 0 : 7 - remaining;
      const nextMonthRange = utils.rangeArr(remaining).map((_, index) => ({
        text: index + 1,
        type: "next"
      }));
      days = currentMonthRange.concat(nextMonthRange);
    } else {
      const firstDay = props.date.startOf("month").day();
      const prevMonthDays = dateTable.getPrevMonthLastDays(props.date, (firstDay - firstDayOfWeek + 7) % 7).map((day) => ({
        text: day,
        type: "prev"
      }));
      const currentMonthDays = dateTable.getMonthDays(props.date).map((day) => ({
        text: day,
        type: "current"
      }));
      days = [...prevMonthDays, ...currentMonthDays];
      const remaining = 7 - (days.length % 7 || 7);
      const nextMonthDays = utils.rangeArr(remaining).map((_, index) => ({
        text: index + 1,
        type: "next"
      }));
      days = days.concat(nextMonthDays);
    }
    return dateTable.toNestedArr(days);
  });
  const weekDays = vue.computed(() => {
    const start = firstDayOfWeek;
    if (start === 0) {
      return date.WEEK_DAYS.map((_) => t(`el.datepicker.weeks.${_}`));
    } else {
      return date.WEEK_DAYS.slice(start).concat(date.WEEK_DAYS.slice(0, start)).map((_) => t(`el.datepicker.weeks.${_}`));
    }
  });
  const getFormattedDate = (day, type) => {
    switch (type) {
      case "prev":
        return props.date.startOf("month").subtract(1, "month").date(day);
      case "next":
        return props.date.startOf("month").add(1, "month").date(day);
      case "current":
        return props.date.date(day);
    }
  };
  const handlePickDay = ({ text, type }) => {
    const date = getFormattedDate(text, type);
    emit("pick", date);
  };
  const getSlotData = ({ text, type }) => {
    const day = getFormattedDate(text, type);
    return {
      isSelected: day.isSame(props.selectedDay),
      type: `${type}-month`,
      day: day.format("YYYY-MM-DD"),
      date: day.toDate()
    };
  };
  return {
    now,
    isInRange,
    rows,
    weekDays,
    getFormattedDate,
    handlePickDay,
    getSlotData
  };
};

exports.useDateTable = useDateTable;
//# sourceMappingURL=use-date-table.js.map
