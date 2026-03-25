import '../../../utils/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { iconPropType } from '../../../utils/vue/icon.mjs';

const linkProps = buildProps({
  type: {
    type: String,
    values: ["primary", "success", "warning", "info", "danger", "default"],
    default: "default"
  },
  underline: {
    type: Boolean,
    default: true
  },
  disabled: { type: Boolean, default: false },
  href: { type: String, default: "" },
  icon: {
    type: iconPropType
  }
});
const linkEmits = {
  click: (evt) => evt instanceof MouseEvent
};

export { linkEmits, linkProps };
//# sourceMappingURL=link.mjs.map
