'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
require('../../../hooks/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var index = require('../../../hooks/use-size/index.js');
var event = require('../../../constants/event.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');

const radioPropsBase = runtime.buildProps({
  size: index.useSizeProp,
  disabled: Boolean,
  label: {
    type: [String, Number, Boolean],
    default: ""
  }
});
const radioProps = runtime.buildProps({
  ...radioPropsBase,
  modelValue: {
    type: [String, Number, Boolean],
    default: ""
  },
  name: {
    type: String,
    default: ""
  },
  border: Boolean
});
const radioEmits = {
  [event.UPDATE_MODEL_EVENT]: (val) => shared.isString(val) || types.isNumber(val) || types.isBoolean(val),
  [event.CHANGE_EVENT]: (val) => shared.isString(val) || types.isNumber(val) || types.isBoolean(val)
};

exports.radioEmits = radioEmits;
exports.radioProps = radioProps;
exports.radioPropsBase = radioPropsBase;
//# sourceMappingURL=radio.js.map
