import '../../../utils/index.mjs';
import '../../virtual-list/index.mjs';
import { columns, expandColumnKey, rowKey } from './common.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { virtualizedGridProps } from '../../virtual-list/src/props.mjs';

const tableV2RowProps = buildProps({
  class: String,
  columns,
  columnsStyles: {
    type: definePropType(Object),
    required: true
  },
  depth: Number,
  expandColumnKey,
  estimatedRowHeight: {
    ...virtualizedGridProps.estimatedRowHeight,
    default: void 0
  },
  isScrolling: Boolean,
  onRowExpand: {
    type: definePropType(Function)
  },
  onRowHover: {
    type: definePropType(Function)
  },
  onRowHeightChange: {
    type: definePropType(Function)
  },
  rowData: {
    type: definePropType(Object),
    required: true
  },
  rowEventHandlers: {
    type: definePropType(Object)
  },
  rowIndex: {
    type: Number,
    required: true
  },
  rowKey,
  style: {
    type: definePropType(Object)
  }
});

export { tableV2RowProps };
//# sourceMappingURL=row.mjs.map
