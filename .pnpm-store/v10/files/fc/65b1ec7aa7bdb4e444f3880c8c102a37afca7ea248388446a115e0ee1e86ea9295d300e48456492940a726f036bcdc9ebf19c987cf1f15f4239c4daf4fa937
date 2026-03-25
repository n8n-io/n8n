'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@popperjs/core');
require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');

const sliderButtonProps = runtime.buildProps({
  modelValue: {
    type: Number,
    default: 0
  },
  vertical: Boolean,
  tooltipClass: String,
  placement: {
    type: String,
    values: core.placements,
    default: "top"
  }
});
const sliderButtonEmits = {
  [event.UPDATE_MODEL_EVENT]: (value) => types.isNumber(value)
};

exports.sliderButtonEmits = sliderButtonEmits;
exports.sliderButtonProps = sliderButtonProps;
//# sourceMappingURL=button.js.map
