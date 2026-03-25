'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lodashUnified = require('lodash-unified');
require('../../../utils/index.js');
require('../../../hooks/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var event = require('../../../constants/event.js');
var shared = require('@vue/shared');

const colorPickerProps = runtime.buildProps({
  modelValue: String,
  id: String,
  showAlpha: Boolean,
  colorFormat: String,
  disabled: Boolean,
  size: index.useSizeProp,
  popperClass: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: void 0
  },
  tabindex: {
    type: [String, Number],
    default: 0
  },
  predefine: {
    type: runtime.definePropType(Array)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const colorPickerEmits = {
  [event.UPDATE_MODEL_EVENT]: (val) => shared.isString(val) || lodashUnified.isNil(val),
  [event.CHANGE_EVENT]: (val) => shared.isString(val) || lodashUnified.isNil(val),
  activeChange: (val) => shared.isString(val) || lodashUnified.isNil(val),
  focus: (event) => event instanceof FocusEvent,
  blur: (event) => event instanceof FocusEvent
};
const colorPickerContextKey = Symbol("colorPickerContextKey");

exports.colorPickerContextKey = colorPickerContextKey;
exports.colorPickerEmits = colorPickerEmits;
exports.colorPickerProps = colorPickerProps;
//# sourceMappingURL=color-picker.js.map
