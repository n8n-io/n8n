'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../constants/index.js');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var event = require('../../../constants/event.js');
var shared = require('@vue/shared');

const checkboxGroupProps = runtime.buildProps({
  modelValue: {
    type: runtime.definePropType(Array),
    default: () => []
  },
  disabled: Boolean,
  min: Number,
  max: Number,
  size: index.useSizeProp,
  label: String,
  fill: String,
  textColor: String,
  tag: {
    type: String,
    default: "div"
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const checkboxGroupEmits = {
  [event.UPDATE_MODEL_EVENT]: (val) => shared.isArray(val),
  change: (val) => shared.isArray(val)
};

exports.checkboxGroupEmits = checkboxGroupEmits;
exports.checkboxGroupProps = checkboxGroupProps;
//# sourceMappingURL=checkbox-group.js.map
