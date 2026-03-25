import '../../../utils/index.mjs';
import '../../virtual-list/index.mjs';
import { columns, dataType, fixedDataType, requiredNumber, classType, styleType } from './common.mjs';
import { tableV2HeaderProps } from './header.mjs';
import { tableV2RowProps } from './row.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';
import { virtualizedListProps, virtualizedGridProps } from '../../virtual-list/src/props.mjs';

const tableV2GridProps = buildProps({
  columns,
  data: dataType,
  fixedData: fixedDataType,
  estimatedRowHeight: tableV2RowProps.estimatedRowHeight,
  width: requiredNumber,
  height: requiredNumber,
  headerWidth: requiredNumber,
  headerHeight: tableV2HeaderProps.headerHeight,
  bodyWidth: requiredNumber,
  rowHeight: requiredNumber,
  cache: virtualizedListProps.cache,
  useIsScrolling: Boolean,
  scrollbarAlwaysOn: virtualizedGridProps.scrollbarAlwaysOn,
  scrollbarStartGap: virtualizedGridProps.scrollbarStartGap,
  scrollbarEndGap: virtualizedGridProps.scrollbarEndGap,
  class: classType,
  style: styleType,
  containerStyle: styleType,
  getRowHeight: {
    type: definePropType(Function),
    required: true
  },
  rowKey: tableV2RowProps.rowKey,
  onRowsRendered: {
    type: definePropType(Function)
  },
  onScroll: {
    type: definePropType(Function)
  }
});

export { tableV2GridProps };
//# sourceMappingURL=grid.mjs.map
