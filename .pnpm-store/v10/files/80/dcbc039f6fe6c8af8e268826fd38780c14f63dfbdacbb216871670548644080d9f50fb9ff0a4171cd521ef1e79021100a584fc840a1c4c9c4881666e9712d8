import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { isNumber, isBoolean } from '../../../utils/types.mjs';
import { CHANGE_EVENT } from '../../../constants/event.mjs';

const affixProps = buildProps({
  zIndex: {
    type: definePropType([Number, String]),
    default: 100
  },
  target: {
    type: String,
    default: ""
  },
  offset: {
    type: Number,
    default: 0
  },
  position: {
    type: String,
    values: ["top", "bottom"],
    default: "top"
  }
});
const affixEmits = {
  scroll: ({ scrollTop, fixed }) => isNumber(scrollTop) && isBoolean(fixed),
  [CHANGE_EVENT]: (fixed) => isBoolean(fixed)
};

export { affixEmits, affixProps };
//# sourceMappingURL=affix.mjs.map
