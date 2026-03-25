import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { radioEmits } from './radio.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';

const radioGroupProps = buildProps({
  id: {
    type: String,
    default: void 0
  },
  size: useSizeProp,
  disabled: Boolean,
  modelValue: {
    type: [String, Number, Boolean],
    default: ""
  },
  fill: {
    type: String,
    default: ""
  },
  label: {
    type: String,
    default: void 0
  },
  textColor: {
    type: String,
    default: ""
  },
  name: {
    type: String,
    default: void 0
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const radioGroupEmits = radioEmits;

export { radioGroupEmits, radioGroupProps };
//# sourceMappingURL=radio-group.mjs.map
