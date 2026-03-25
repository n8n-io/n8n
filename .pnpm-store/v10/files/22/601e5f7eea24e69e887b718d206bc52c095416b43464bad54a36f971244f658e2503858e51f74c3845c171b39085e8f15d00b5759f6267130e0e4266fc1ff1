'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../constants/index.js');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');

const stepsProps = runtime.buildProps({
  space: {
    type: [Number, String],
    default: ""
  },
  active: {
    type: Number,
    default: 0
  },
  direction: {
    type: String,
    default: "horizontal",
    values: ["horizontal", "vertical"]
  },
  alignCenter: {
    type: Boolean
  },
  simple: {
    type: Boolean
  },
  finishStatus: {
    type: String,
    values: ["wait", "process", "finish", "error", "success"],
    default: "finish"
  },
  processStatus: {
    type: String,
    values: ["wait", "process", "finish", "error", "success"],
    default: "process"
  }
});
const stepsEmits = {
  [event.CHANGE_EVENT]: (newVal, oldVal) => [newVal, oldVal].every(types.isNumber)
};

exports.stepsEmits = stepsEmits;
exports.stepsProps = stepsProps;
//# sourceMappingURL=steps.js.map
