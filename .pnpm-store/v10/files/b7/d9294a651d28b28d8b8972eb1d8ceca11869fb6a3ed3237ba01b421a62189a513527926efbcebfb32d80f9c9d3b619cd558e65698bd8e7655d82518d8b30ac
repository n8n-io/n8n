import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const watermarkProps = buildProps({
  zIndex: {
    type: Number,
    default: 9
  },
  rotate: {
    type: Number,
    default: -22
  },
  width: Number,
  height: Number,
  image: String,
  content: {
    type: definePropType([String, Array]),
    default: "Element Plus"
  },
  font: {
    type: definePropType(Object)
  },
  gap: {
    type: definePropType(Array),
    default: () => [100, 100]
  },
  offset: {
    type: definePropType(Array)
  }
});

export { watermarkProps };
//# sourceMappingURL=watermark.mjs.map
