import '../../button/index.mjs';
import { QuestionFilled } from '@element-plus/icons-vue';
import '../../../utils/index.mjs';
import '../../tooltip/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { buttonTypes } from '../../button/src/button.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';
import { useTooltipContentProps } from '../../tooltip/src/content.mjs';

const popconfirmProps = buildProps({
  title: String,
  confirmButtonText: String,
  cancelButtonText: String,
  confirmButtonType: {
    type: String,
    values: buttonTypes,
    default: "primary"
  },
  cancelButtonType: {
    type: String,
    values: buttonTypes,
    default: "text"
  },
  icon: {
    type: iconPropType,
    default: () => QuestionFilled
  },
  iconColor: {
    type: String,
    default: "#f90"
  },
  hideIcon: {
    type: Boolean,
    default: false
  },
  hideAfter: {
    type: Number,
    default: 200
  },
  teleported: useTooltipContentProps.teleported,
  persistent: useTooltipContentProps.persistent,
  width: {
    type: [String, Number],
    default: 150
  }
});
const popconfirmEmits = {
  confirm: (e) => e instanceof MouseEvent,
  cancel: (e) => e instanceof MouseEvent
};

export { popconfirmEmits, popconfirmProps };
//# sourceMappingURL=popconfirm.mjs.map
