import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const cardProps = buildProps({
  header: {
    type: String,
    default: ""
  },
  footer: {
    type: String,
    default: ""
  },
  bodyStyle: {
    type: definePropType([String, Object, Array]),
    default: ""
  },
  bodyClass: String,
  shadow: {
    type: String,
    values: ["always", "hover", "never"],
    default: "always"
  }
});

export { cardProps };
//# sourceMappingURL=card.mjs.map
