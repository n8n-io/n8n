import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { isString } from '@vue/shared';
import { isNumber, isBoolean } from '../../../utils/types.mjs';

const checkboxProps = {
  modelValue: {
    type: [Number, String, Boolean],
    default: void 0
  },
  label: {
    type: [String, Boolean, Number, Object],
    default: void 0
  },
  indeterminate: Boolean,
  disabled: Boolean,
  checked: Boolean,
  name: {
    type: String,
    default: void 0
  },
  trueLabel: {
    type: [String, Number],
    default: void 0
  },
  falseLabel: {
    type: [String, Number],
    default: void 0
  },
  id: {
    type: String,
    default: void 0
  },
  controls: {
    type: String,
    default: void 0
  },
  border: Boolean,
  size: useSizeProp,
  tabindex: [String, Number],
  validateEvent: {
    type: Boolean,
    default: true
  }
};
const checkboxEmits = {
  [UPDATE_MODEL_EVENT]: (val) => isString(val) || isNumber(val) || isBoolean(val),
  change: (val) => isString(val) || isNumber(val) || isBoolean(val)
};

export { checkboxEmits, checkboxProps };
//# sourceMappingURL=checkbox.mjs.map
