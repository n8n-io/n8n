'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@popperjs/core');
require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var types = require('../../../utils/types.js');
var shared = require('@vue/shared');
var event = require('../../../constants/event.js');

const sliderProps = runtime.buildProps({
  modelValue: {
    type: runtime.definePropType([Number, Array]),
    default: 0
  },
  id: {
    type: String,
    default: void 0
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  showInput: Boolean,
  showInputControls: {
    type: Boolean,
    default: true
  },
  size: index.useSizeProp,
  inputSize: index.useSizeProp,
  showStops: Boolean,
  showTooltip: {
    type: Boolean,
    default: true
  },
  formatTooltip: {
    type: runtime.definePropType(Function),
    default: void 0
  },
  disabled: Boolean,
  range: Boolean,
  vertical: Boolean,
  height: String,
  debounce: {
    type: Number,
    default: 300
  },
  label: {
    type: String,
    default: void 0
  },
  rangeStartLabel: {
    type: String,
    default: void 0
  },
  rangeEndLabel: {
    type: String,
    default: void 0
  },
  formatValueText: {
    type: runtime.definePropType(Function),
    default: void 0
  },
  tooltipClass: {
    type: String,
    default: void 0
  },
  placement: {
    type: String,
    values: core.placements,
    default: "top"
  },
  marks: {
    type: runtime.definePropType(Object)
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const isValidValue = (value) => types.isNumber(value) || shared.isArray(value) && value.every(types.isNumber);
const sliderEmits = {
  [event.UPDATE_MODEL_EVENT]: isValidValue,
  [event.INPUT_EVENT]: isValidValue,
  [event.CHANGE_EVENT]: isValidValue
};

exports.sliderEmits = sliderEmits;
exports.sliderProps = sliderProps;
//# sourceMappingURL=slider.js.map
