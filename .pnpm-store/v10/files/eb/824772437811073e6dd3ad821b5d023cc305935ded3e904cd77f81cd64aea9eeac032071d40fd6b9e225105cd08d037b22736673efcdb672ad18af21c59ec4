import '../../../../utils/index.mjs';
import '../../../../constants/index.mjs';
import { buildProps, definePropType } from '../../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../../utils/typescript.mjs';
import { componentSizes } from '../../../../constants/size.mjs';

const paginationSizesProps = buildProps({
  pageSize: {
    type: Number,
    required: true
  },
  pageSizes: {
    type: definePropType(Array),
    default: () => mutable([10, 20, 30, 40, 50, 100])
  },
  popperClass: {
    type: String
  },
  disabled: Boolean,
  teleported: Boolean,
  size: {
    type: String,
    values: componentSizes
  }
});

export { paginationSizesProps };
//# sourceMappingURL=sizes.mjs.map
