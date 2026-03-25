import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { isValidComponentSize } from '../../../utils/vue/validator.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT, INPUT_EVENT } from '../../../constants/event.mjs';
import { isBoolean, isNumber } from '../../../utils/types.mjs';
import { isString } from '@vue/shared';

const switchProps = buildProps({
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
    validator: isValidComponentSize
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
    type: iconPropType
  },
  activeActionIcon: {
    type: iconPropType
  },
  activeIcon: {
    type: iconPropType
  },
  inactiveIcon: {
    type: iconPropType
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
    type: definePropType(Function)
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
  [UPDATE_MODEL_EVENT]: (val) => isBoolean(val) || isString(val) || isNumber(val),
  [CHANGE_EVENT]: (val) => isBoolean(val) || isString(val) || isNumber(val),
  [INPUT_EVENT]: (val) => isBoolean(val) || isString(val) || isNumber(val)
};

export { switchEmits, switchProps };
//# sourceMappingURL=switch.mjs.map
