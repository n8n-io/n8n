'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');

const progressProps = runtime.buildProps({
  type: {
    type: String,
    default: "line",
    values: ["line", "circle", "dashboard"]
  },
  percentage: {
    type: Number,
    default: 0,
    validator: (val) => val >= 0 && val <= 100
  },
  status: {
    type: String,
    default: "",
    values: ["", "success", "exception", "warning"]
  },
  indeterminate: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 3
  },
  strokeWidth: {
    type: Number,
    default: 6
  },
  strokeLinecap: {
    type: runtime.definePropType(String),
    default: "round"
  },
  textInside: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 126
  },
  showText: {
    type: Boolean,
    default: true
  },
  color: {
    type: runtime.definePropType([
      String,
      Array,
      Function
    ]),
    default: ""
  },
  striped: Boolean,
  stripedFlow: Boolean,
  format: {
    type: runtime.definePropType(Function),
    default: (percentage) => `${percentage}%`
  }
});

exports.progressProps = progressProps;
//# sourceMappingURL=progress.js.map
