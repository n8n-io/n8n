import '../../../utils/index.mjs';
import { column } from './common.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const tableV2CellProps = buildProps({
  class: String,
  cellData: {
    type: definePropType([String, Boolean, Number, Object])
  },
  column,
  columnIndex: Number,
  style: {
    type: definePropType([String, Array, Object])
  },
  rowData: {
    type: definePropType(Object)
  },
  rowIndex: Number
});

export { tableV2CellProps };
//# sourceMappingURL=cell.mjs.map
