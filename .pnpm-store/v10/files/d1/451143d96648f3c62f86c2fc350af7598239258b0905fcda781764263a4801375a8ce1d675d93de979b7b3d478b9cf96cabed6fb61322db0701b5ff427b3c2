import '../../../utils/index.mjs';
import { tooltipV2Sides } from './common.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const tooltipV2ArrowProps = buildProps({
  width: {
    type: Number,
    default: 10
  },
  height: {
    type: Number,
    default: 10
  },
  style: {
    type: definePropType(Object),
    default: null
  }
});
const tooltipV2ArrowSpecialProps = buildProps({
  side: {
    type: definePropType(String),
    values: tooltipV2Sides,
    required: true
  }
});

export { tooltipV2ArrowProps, tooltipV2ArrowSpecialProps };
//# sourceMappingURL=arrow.mjs.map
