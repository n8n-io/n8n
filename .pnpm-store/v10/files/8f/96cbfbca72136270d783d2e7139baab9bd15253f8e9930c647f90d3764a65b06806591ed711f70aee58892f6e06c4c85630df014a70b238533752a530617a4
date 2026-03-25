import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';
import { isString } from '@vue/shared';
import { isNumber, isBoolean } from '../../../utils/types.mjs';

const radioPropsBase = buildProps({
  size: useSizeProp,
  disabled: Boolean,
  label: {
    type: [String, Number, Boolean],
    default: ""
  }
});
const radioProps = buildProps({
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
  [UPDATE_MODEL_EVENT]: (val) => isString(val) || isNumber(val) || isBoolean(val),
  [CHANGE_EVENT]: (val) => isString(val) || isNumber(val) || isBoolean(val)
};

export { radioEmits, radioProps, radioPropsBase };
//# sourceMappingURL=radio.mjs.map
