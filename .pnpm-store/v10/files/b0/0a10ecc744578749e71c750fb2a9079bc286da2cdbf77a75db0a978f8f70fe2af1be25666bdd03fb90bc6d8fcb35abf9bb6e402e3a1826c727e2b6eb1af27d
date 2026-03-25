import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { isBoolean } from '../../../utils/types.mjs';
import { CHANGE_EVENT } from '../../../constants/event.mjs';

const checkTagProps = buildProps({
  checked: {
    type: Boolean,
    default: false
  }
});
const checkTagEmits = {
  "update:checked": (value) => isBoolean(value),
  [CHANGE_EVENT]: (value) => isBoolean(value)
};

export { checkTagEmits, checkTagProps };
//# sourceMappingURL=check-tag.mjs.map
