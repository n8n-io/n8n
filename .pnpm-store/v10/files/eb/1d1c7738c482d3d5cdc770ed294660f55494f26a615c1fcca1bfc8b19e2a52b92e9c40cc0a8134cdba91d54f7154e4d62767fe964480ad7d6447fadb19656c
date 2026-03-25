import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { generateId } from '../../../utils/rand.mjs';

const collapseItemProps = buildProps({
  title: {
    type: String,
    default: ""
  },
  name: {
    type: definePropType([String, Number]),
    default: () => generateId()
  },
  disabled: Boolean
});

export { collapseItemProps };
//# sourceMappingURL=collapse-item.mjs.map
