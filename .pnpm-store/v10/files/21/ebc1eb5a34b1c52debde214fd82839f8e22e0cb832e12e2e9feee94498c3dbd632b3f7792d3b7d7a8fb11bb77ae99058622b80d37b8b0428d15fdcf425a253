import '../../../utils/index.mjs';
import '../../virtual-list/index.mjs';
import { rowKey, columns, dataType, fixedDataType, expandKeys, classType, requiredNumber } from './common.mjs';
import { tableV2RowProps } from './row.mjs';
import { tableV2HeaderProps } from './header.mjs';
import { tableV2GridProps } from './grid.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { virtualizedGridProps, virtualizedScrollbarProps } from '../../virtual-list/src/props.mjs';

const tableV2Props = buildProps({
  cache: tableV2GridProps.cache,
  estimatedRowHeight: tableV2RowProps.estimatedRowHeight,
  rowKey,
  headerClass: {
    type: definePropType([
      String,
      Function
    ])
  },
  headerProps: {
    type: definePropType([
      Object,
      Function
    ])
  },
  headerCellProps: {
    type: definePropType([
      Object,
      Function
    ])
  },
  headerHeight: tableV2HeaderProps.headerHeight,
  footerHeight: {
    type: Number,
    default: 0
  },
  rowClass: {
    type: definePropType([String, Function])
  },
  rowProps: {
    type: definePropType([Object, Function])
  },
  rowHeight: {
    type: Number,
    default: 50
  },
  cellProps: {
    type: definePropType([
      Object,
      Function
    ])
  },
  columns,
  data: dataType,
  dataGetter: {
    type: definePropType(Function)
  },
  fixedData: fixedDataType,
  expandColumnKey: tableV2RowProps.expandColumnKey,
  expandedRowKeys: expandKeys,
  defaultExpandedRowKeys: expandKeys,
  class: classType,
  fixed: Boolean,
  style: {
    type: definePropType(Object)
  },
  width: requiredNumber,
  height: requiredNumber,
  maxHeight: Number,
  useIsScrolling: Boolean,
  indentSize: {
    type: Number,
    default: 12
  },
  iconSize: {
    type: Number,
    default: 12
  },
  hScrollbarSize: virtualizedGridProps.hScrollbarSize,
  vScrollbarSize: virtualizedGridProps.vScrollbarSize,
  scrollbarAlwaysOn: virtualizedScrollbarProps.alwaysOn,
  sortBy: {
    type: definePropType(Object),
    default: () => ({})
  },
  sortState: {
    type: definePropType(Object),
    default: void 0
  },
  onColumnSort: {
    type: definePropType(Function)
  },
  onExpandedRowsChange: {
    type: definePropType(Function)
  },
  onEndReached: {
    type: definePropType(Function)
  },
  onRowExpand: tableV2RowProps.onRowExpand,
  onScroll: tableV2GridProps.onScroll,
  onRowsRendered: tableV2GridProps.onRowsRendered,
  rowEventHandlers: tableV2RowProps.rowEventHandlers
});

export { tableV2Props };
//# sourceMappingURL=table.mjs.map
