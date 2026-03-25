'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lodashUnified = require('lodash-unified');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var types = require('../../../utils/types.js');
var event = require('../../../constants/event.js');

const inputNumberProps = runtime.buildProps({
  id: {
    type: String,
    default: void 0
  },
  step: {
    type: Number,
    default: 1
  },
  stepStrictly: Boolean,
  max: {
    type: Number,
    default: Number.POSITIVE_INFINITY
  },
  min: {
    type: Number,
    default: Number.NEGATIVE_INFINITY
  },
  modelValue: Number,
  readonly: Boolean,
  disabled: Boolean,
  size: index.useSizeProp,
  controls: {
    type: Boolean,
    default: true
  },
  controlsPosition: {
    type: String,
    default: "",
    values: ["", "right"]
  },
  valueOnClear: {
    type: [String, Number, null],
    validator: (val) => val === null || types.isNumber(val) || ["min", "max"].includes(val),
    default: null
  },
  name: String,
  label: String,
  placeholder: String,
  precision: {
    type: Number,
    validator: (val) => val >= 0 && val === Number.parseInt(`${val}`, 10)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const inputNumberEmits = {
  [event.CHANGE_EVENT]: (cur, prev) => prev !== cur,
  blur: (e) => e instanceof FocusEvent,
  focus: (e) => e instanceof FocusEvent,
  [event.INPUT_EVENT]: (val) => types.isNumber(val) || lodashUnified.isNil(val),
  [event.UPDATE_MODEL_EVENT]: (val) => types.isNumber(val) || lodashUnified.isNil(val)
};

exports.inputNumberEmits = inputNumberEmits;
exports.inputNumberProps = inputNumberProps;
//# sourceMappingURL=input-number.js.map
