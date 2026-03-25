'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../time-picker/index.js');
var utils = require('../../time-picker/src/utils.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var shared = require('@vue/shared');

const getPrevMonthLastDays = (date, count) => {
  const lastDay = date.subtract(1, "month").endOf("month").date();
  return utils.rangeArr(count).map((_, index) => lastDay - (count - index - 1));
};
const getMonthDays = (date) => {
  const days = date.daysInMonth();
  return utils.rangeArr(days).map((_, index) => index + 1);
};
const toNestedArr = (days) => utils.rangeArr(days.length / 7).map((index) => {
  const start = index * 7;
  return days.slice(start, start + 7);
});
const dateTableProps = runtime.buildProps({
  selectedDay: {
    type: runtime.definePropType(Object)
  },
  range: {
    type: runtime.definePropType(Array)
  },
  date: {
    type: runtime.definePropType(Object),
    required: true
  },
  hideHeader: {
    type: Boolean
  }
});
const dateTableEmits = {
  pick: (value) => shared.isObject(value)
};

exports.dateTableEmits = dateTableEmits;
exports.dateTableProps = dateTableProps;
exports.getMonthDays = getMonthDays;
exports.getPrevMonthLastDays = getPrevMonthLastDays;
exports.toNestedArr = toNestedArr;
//# sourceMappingURL=date-table.js.map
