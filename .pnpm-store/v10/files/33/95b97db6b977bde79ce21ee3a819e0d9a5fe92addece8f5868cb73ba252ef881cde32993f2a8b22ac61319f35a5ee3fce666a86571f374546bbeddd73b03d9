import '../../../../utils/index.mjs';
import { buildProps } from '../../../../utils/vue/props/runtime.mjs';
import { iconPropType } from '../../../../utils/vue/icon.mjs';

const paginationPrevProps = buildProps({
  disabled: Boolean,
  currentPage: {
    type: Number,
    default: 1
  },
  prevText: {
    type: String
  },
  prevIcon: {
    type: iconPropType
  }
});
const paginationPrevEmits = {
  click: (evt) => evt instanceof MouseEvent
};

export { paginationPrevEmits, paginationPrevProps };
//# sourceMappingURL=prev.mjs.map
