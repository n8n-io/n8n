import '../../../utils/index.mjs';
import '../../../constants/index.mjs';
import { buildProps } from '../../../utils/vue/props/runtime.mjs';
import { componentSizes } from '../../../constants/size.mjs';

const textProps = buildProps({
  type: {
    type: String,
    values: ["primary", "success", "info", "warning", "danger", ""],
    default: ""
  },
  size: {
    type: String,
    values: componentSizes,
    default: ""
  },
  truncated: {
    type: Boolean
  },
  lineClamp: {
    type: [String, Number]
  },
  tag: {
    type: String,
    default: "span"
  }
});

export { textProps };
//# sourceMappingURL=text.mjs.map
