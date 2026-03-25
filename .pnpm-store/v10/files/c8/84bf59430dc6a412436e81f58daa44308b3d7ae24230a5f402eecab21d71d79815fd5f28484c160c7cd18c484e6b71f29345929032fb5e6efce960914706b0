import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';
import { isNumber } from '../../../utils/types.mjs';

const imageViewerProps = buildProps({
  urlList: {
    type: definePropType(Array),
    default: () => mutable([])
  },
  zIndex: {
    type: Number
  },
  initialIndex: {
    type: Number,
    default: 0
  },
  infinite: {
    type: Boolean,
    default: true
  },
  hideOnClickModal: Boolean,
  teleported: Boolean,
  closeOnPressEscape: {
    type: Boolean,
    default: true
  },
  zoomRate: {
    type: Number,
    default: 1.2
  },
  minScale: {
    type: Number,
    default: 0.2
  },
  maxScale: {
    type: Number,
    default: 7
  }
});
const imageViewerEmits = {
  close: () => true,
  switch: (index) => isNumber(index),
  rotate: (deg) => isNumber(deg)
};

export { imageViewerEmits, imageViewerProps };
//# sourceMappingURL=image-viewer.mjs.map
