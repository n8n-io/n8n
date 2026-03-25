import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { isNumber } from '../../../utils/types.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';
import { UPDATE_MODEL_EVENT, CHANGE_EVENT } from '../../../constants/event.mjs';

const emitChangeFn = (value) => typeof isNumber(value);
const collapseProps = buildProps({
  accordion: Boolean,
  modelValue: {
    type: definePropType([Array, String, Number]),
    default: () => mutable([])
  }
});
const collapseEmits = {
  [UPDATE_MODEL_EVENT]: emitChangeFn,
  [CHANGE_EVENT]: emitChangeFn
};

export { collapseEmits, collapseProps, emitChangeFn };
//# sourceMappingURL=collapse.mjs.map
