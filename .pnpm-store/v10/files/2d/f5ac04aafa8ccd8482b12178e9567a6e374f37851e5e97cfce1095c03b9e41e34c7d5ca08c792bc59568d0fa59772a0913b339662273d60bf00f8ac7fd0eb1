import { createVNode, mergeProps } from 'vue';
import { get } from 'lodash-unified';
import '../../../../utils/index.mjs';
import '../components/index.mjs';
import { Alignment } from '../constants.mjs';
import { placeholderSign } from '../private.mjs';
import { enforceUnit, componentToSlot, tryCall } from '../utils.mjs';
import TableV2Cell from '../components/cell.mjs';
import { isFunction, isObject } from '@vue/shared';
import ExpandIcon from '../components/expand-icon.mjs';

const CellRenderer = ({
  columns,
  column,
  columnIndex,
  depth,
  expandIconProps,
  isScrolling,
  rowData,
  rowIndex,
  style,
  expandedRowKeys,
  ns,
  cellProps: _cellProps,
  expandColumnKey,
  indentSize,
  iconSize,
  rowKey
}, {
  slots
}) => {
  const cellStyle = enforceUnit(style);
  if (column.placeholderSign === placeholderSign) {
    return createVNode("div", {
      "class": ns.em("row-cell", "placeholder"),
      "style": cellStyle
    }, null);
  }
  const {
    cellRenderer,
    dataKey,
    dataGetter
  } = column;
  const columnCellRenderer = componentToSlot(cellRenderer);
  const CellComponent = columnCellRenderer || slots.default || ((props) => createVNode(TableV2Cell, props, null));
  const cellData = isFunction(dataGetter) ? dataGetter({
    columns,
    column,
    columnIndex,
    rowData,
    rowIndex
  }) : get(rowData, dataKey != null ? dataKey : "");
  const extraCellProps = tryCall(_cellProps, {
    cellData,
    columns,
    column,
    columnIndex,
    rowIndex,
    rowData
  });
  const cellProps = {
    class: ns.e("cell-text"),
    columns,
    column,
    columnIndex,
    cellData,
    isScrolling,
    rowData,
    rowIndex
  };
  const Cell = CellComponent(cellProps);
  const kls = [ns.e("row-cell"), column.class, column.align === Alignment.CENTER && ns.is("align-center"), column.align === Alignment.RIGHT && ns.is("align-right")];
  const expandable = rowIndex >= 0 && expandColumnKey && column.key === expandColumnKey;
  const expanded = rowIndex >= 0 && expandedRowKeys.includes(rowData[rowKey]);
  let IconOrPlaceholder;
  const iconStyle = `margin-inline-start: ${depth * indentSize}px;`;
  if (expandable) {
    if (isObject(expandIconProps)) {
      IconOrPlaceholder = createVNode(ExpandIcon, mergeProps(expandIconProps, {
        "class": [ns.e("expand-icon"), ns.is("expanded", expanded)],
        "size": iconSize,
        "expanded": expanded,
        "style": iconStyle,
        "expandable": true
      }), null);
    } else {
      IconOrPlaceholder = createVNode("div", {
        "style": [iconStyle, `width: ${iconSize}px; height: ${iconSize}px;`].join(" ")
      }, null);
    }
  }
  return createVNode("div", mergeProps({
    "class": kls,
    "style": cellStyle
  }, extraCellProps, {
    "role": "cell"
  }), [IconOrPlaceholder, Cell]);
};
CellRenderer.inheritAttrs = false;

export { CellRenderer as default };
//# sourceMappingURL=cell.mjs.map
