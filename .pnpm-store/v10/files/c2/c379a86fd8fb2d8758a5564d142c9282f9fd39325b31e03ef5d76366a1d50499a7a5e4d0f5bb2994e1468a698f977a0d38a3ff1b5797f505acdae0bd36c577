'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../components/index.js');
var utils = require('../utils.js');
var row = require('../components/row.js');

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !vue.isVNode(s);
}
const RowRenderer = (props, {
  slots
}) => {
  const {
    columns,
    columnsStyles,
    depthMap,
    expandColumnKey,
    expandedRowKeys,
    estimatedRowHeight,
    hasFixedColumns,
    hoveringRowKey,
    rowData,
    rowIndex,
    style,
    isScrolling,
    rowProps,
    rowClass,
    rowKey,
    rowEventHandlers,
    ns,
    onRowHovered,
    onRowExpanded
  } = props;
  const rowKls = utils.tryCall(rowClass, {
    columns,
    rowData,
    rowIndex
  }, "");
  const additionalProps = utils.tryCall(rowProps, {
    columns,
    rowData,
    rowIndex
  });
  const _rowKey = rowData[rowKey];
  const depth = depthMap[_rowKey] || 0;
  const canExpand = Boolean(expandColumnKey);
  const isFixedRow = rowIndex < 0;
  const kls = [ns.e("row"), rowKls, {
    [ns.e(`row-depth-${depth}`)]: canExpand && rowIndex >= 0,
    [ns.is("expanded")]: canExpand && expandedRowKeys.includes(_rowKey),
    [ns.is("hovered")]: !isScrolling && _rowKey === hoveringRowKey,
    [ns.is("fixed")]: !depth && isFixedRow,
    [ns.is("customized")]: Boolean(slots.row)
  }];
  const onRowHover = hasFixedColumns ? onRowHovered : void 0;
  const _rowProps = {
    ...additionalProps,
    columns,
    columnsStyles,
    class: kls,
    depth,
    expandColumnKey,
    estimatedRowHeight: isFixedRow ? void 0 : estimatedRowHeight,
    isScrolling,
    rowIndex,
    rowData,
    rowKey: _rowKey,
    rowEventHandlers,
    style
  };
  return vue.createVNode(row["default"], vue.mergeProps(_rowProps, {
    "onRowHover": onRowHover,
    "onRowExpand": onRowExpanded
  }), _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

exports["default"] = RowRenderer;
//# sourceMappingURL=row.js.map
