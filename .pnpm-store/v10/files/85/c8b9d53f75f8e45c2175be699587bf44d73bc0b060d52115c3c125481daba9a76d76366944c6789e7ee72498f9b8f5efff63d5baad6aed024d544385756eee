import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { useSizeProp } from '../../../hooks/use-size/index.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { isArray } from '@vue/shared';

const checkboxGroupProps = buildProps({
  modelValue: {
    type: definePropType(Array),
    default: () => []
  },
  disabled: Boolean,
  min: Number,
  max: Number,
  size: useSizeProp,
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
  [UPDATE_MODEL_EVENT]: (val) => isArray(val),
  change: (val) => isArray(val)
};

export { checkboxGroupEmits, checkboxGroupProps };
//# sourceMappingURL=checkbox-group.mjs.map
