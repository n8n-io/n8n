import { isNil } from 'lodash-unified';
import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';
import { isArray } from '@vue/shared';
import { CHANGE_EVENT, UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';

const LEFT_CHECK_CHANGE_EVENT = "left-check-change";
const RIGHT_CHECK_CHANGE_EVENT = "right-check-change";
const transferProps = buildProps({
  data: {
    type: definePropType(Array),
    default: () => []
  },
  titles: {
    type: definePropType(Array),
    default: () => []
  },
  buttonTexts: {
    type: definePropType(Array),
    default: () => []
  },
  filterPlaceholder: String,
  filterMethod: {
    type: definePropType(Function)
  },
  leftDefaultChecked: {
    type: definePropType(Array),
    default: () => []
  },
  rightDefaultChecked: {
    type: definePropType(Array),
    default: () => []
  },
  renderContent: {
    type: definePropType(Function)
  },
  modelValue: {
    type: definePropType(Array),
    default: () => []
  },
  format: {
    type: definePropType(Object),
    default: () => ({})
  },
  filterable: Boolean,
  props: {
    type: definePropType(Object),
    default: () => mutable({
      label: "label",
      key: "key",
      disabled: "disabled"
    })
  },
  targetOrder: {
    type: String,
    values: ["original", "push", "unshift"],
    default: "original"
  },
  validateEvent: {
    type: Boolean,
    default: true
  }
});
const transferCheckedChangeFn = (value, movedKeys) => [value, movedKeys].every(isArray) || isArray(value) && isNil(movedKeys);
const transferEmits = {
  [CHANGE_EVENT]: (value, direction, movedKeys) => [value, movedKeys].every(isArray) && ["left", "right"].includes(direction),
  [UPDATE_MODEL_EVENT]: (value) => isArray(value),
  [LEFT_CHECK_CHANGE_EVENT]: transferCheckedChangeFn,
  [RIGHT_CHECK_CHANGE_EVENT]: transferCheckedChangeFn
};

export { LEFT_CHECK_CHANGE_EVENT, RIGHT_CHECK_CHANGE_EVENT, transferCheckedChangeFn, transferEmits, transferProps };
//# sourceMappingURL=transfer.mjs.map
