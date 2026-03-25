'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');

const countdownProps = runtime.buildProps({
  format: {
    type: String,
    default: "HH:mm:ss"
  },
  prefix: String,
  suffix: String,
  title: String,
  value: {
    type: runtime.definePropType([Number, Object]),
    default: 0
  },
  valueStyle: {
    type: runtime.definePropType([String, Object, Array])
  }
});
const countdownEmits = {
  finish: () => true,
  [event.CHANGE_EVENT]: (value) => types.isNumber(value)
};

exports.countdownEmits = countdownEmits;
exports.countdownProps = countdownProps;
//# sourceMappingURL=countdown.js.map
