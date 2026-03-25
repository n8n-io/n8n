'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../utils/index.js');
require('../../../constants/index.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var validator = require('../../../utils/vue/validator.js');
var icon = require('../../../utils/vue/icon.js');
var event = require('../../../constants/event.js');
var types = require('../../../utils/types.js');
var shared = require('@vue/shared');

const switchProps = runtime.buildProps({
  modelValue: {
    type: [Boolean, String, Number],
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    validator: validator.isValidComponentSize
  },
  width: {
    type: [String, Number],
    default: ""
  },
  inlinePrompt: {
    type: Boolean,
    default: false
  },
  inactiveActionIcon: {
    type: icon.iconPropType
  },
  activeActionIcon: {
    type: icon.iconPropType
  },
  activeIcon: {
    type: icon.iconPropType
  },
  inactiveIcon: {
    type: icon.iconPropType
  },
  activeText: {
    type: String,
    default: ""
  },
  inactiveText: {
    type: String,
    default: ""
  },
  activeValue: {
    type: [Boolean, String, Number],
    default: true
  },
  inactiveValue: {
    type: [Boolean, String, Number],
    default: false
  },
  activeColor: {
    type: String,
    default: ""
  },
  inactiveColor: {
    type: String,
    default: ""
  },
  borderColor: {
    type: String,
    default: ""
  },
  name: {
    type: String,
    default: ""
  },
  validateEvent: {
    type: Boolean,
    default: true
  },
  beforeChange: {
    type: runtime.definePropType(Function)
  },
  id: String,
  tabindex: {
    type: [String, Number]
  },
  value: {
    type: [Boolean, String, Number],
    default: false
  },
  label: {
    type: String,
    default: void 0
  }
});
const switchEmits = {
  [event.UPDATE_MODEL_EVENT]: (val) => types.isBoolean(val) || shared.isString(val) || types.isNumber(val),
  [event.CHANGE_EVENT]: (val) => types.isBoolean(val) || shared.isString(val) || types.isNumber(val),
  [event.INPUT_EVENT]: (val) => types.isBoolean(val) || shared.isString(val) || types.isNumber(val)
};

exports.switchEmits = switchEmits;
exports.switchProps = switchProps;
//# sourceMappingURL=switch.js.map
