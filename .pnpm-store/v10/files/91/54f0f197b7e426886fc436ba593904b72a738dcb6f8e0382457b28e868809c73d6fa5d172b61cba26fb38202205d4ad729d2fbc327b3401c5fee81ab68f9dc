'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../components/index.js');
var constants = require('../constants.js');
var _private = require('../private.js');
var utils = require('../utils.js');
var headerCell = require('../components/header-cell.js');
var sortIcon = require('../components/sort-icon.js');

const HeaderCellRenderer = (props, {
  slots
}) => {
  const {
    column,
    ns,
    style,
    onColumnSorted
  } = props;
  const cellStyle = utils.enforceUnit(style);
  if (column.placeholderSign === _private.placeholderSign) {
    return vue.createVNode("div", {
      "class": ns.em("header-row-cell", "placeholder"),
      "style": cellStyle
    }, null);
  }
  const {
    headerCellRenderer,
    headerClass,
    sortable
  } = column;
  const cellProps = {
    ...props,
    class: ns.e("header-cell-text")
  };
  const cellRenderer = utils.componentToSlot(headerCellRenderer) || slots.default || ((props2) => vue.createVNode(headerCell["default"], props2, null));
  const Cell = cellRenderer(cellProps);
  const {
    sortBy,
    sortState,
    headerCellProps
  } = props;
  let sorting, sortOrder;
  if (sortState) {
    const order = sortState[column.key];
    sorting = Boolean(constants.oppositeOrderMap[order]);
    sortOrder = sorting ? order : constants.SortOrder.ASC;
  } else {
    sorting = column.key === sortBy.key;
    sortOrder = sorting ? sortBy.order : constants.SortOrder.ASC;
  }
  const cellKls = [ns.e("header-cell"), utils.tryCall(headerClass, props, ""), column.align === constants.Alignment.CENTER && ns.is("align-center"), column.align === constants.Alignment.RIGHT && ns.is("align-right"), sortable && ns.is("sortable")];
  const cellWrapperProps = {
    ...utils.tryCall(headerCellProps, props),
    onClick: column.sortable ? onColumnSorted : void 0,
    class: cellKls,
    style: cellStyle,
    ["data-key"]: column.key
  };
  return vue.createVNode("div", vue.mergeProps(cellWrapperProps, {
    "role": "columnheader"
  }), [Cell, sortable && vue.createVNode(sortIcon["default"], {
    "class": [ns.e("sort-icon"), sorting && ns.is("sorting")],
    "sortOrder": sortOrder
  }, null)]);
};

exports["default"] = HeaderCellRenderer;
//# sourceMappingURL=header-cell.js.map
