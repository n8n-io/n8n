'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var shared = require('@vue/shared');
var runtime = require('../../../utils/vue/props/runtime.js');
var event = require('../../../constants/event.js');

const isValidRange = (range) => shared.isArray(range) && range.length === 2 && range.every((item) => shared.isDate(item));
const calendarProps = runtime.buildProps({
  modelValue: {
    type: Date
  },
  range: {
    type: runtime.definePropType(Array),
    validator: isValidRange
  }
});
const calendarEmits = {
  [event.UPDATE_MODEL_EVENT]: (value) => shared.isDate(value),
  [event.INPUT_EVENT]: (value) => shared.isDate(value)
};

exports.calendarEmits = calendarEmits;
exports.calendarProps = calendarProps;
//# sourceMappingURL=calendar.js.map
