import { NOOP } from '@vue/shared';
import '../../../utils/index.mjs';
import { uploadListTypes } from './upload.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';

const uploadListProps = buildProps({
  files: {
    type: definePropType(Array),
    default: () => mutable([])
  },
  disabled: {
    type: Boolean,
    default: false
  },
  handlePreview: {
    type: definePropType(Function),
    default: NOOP
  },
  listType: {
    type: String,
    values: uploadListTypes,
    default: "text"
  }
});
const uploadListEmits = {
  remove: (file) => !!file
};

export { uploadListEmits, uploadListProps };
//# sourceMappingURL=upload-list.mjs.map
