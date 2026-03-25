'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var tableGrid = require('../table-grid.js');

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !vue.isVNode(s);
}
const LeftTable = (props, {
  slots
}) => {
  if (!props.columns.length)
    return;
  const {
    leftTableRef,
    ...rest
  } = props;
  return vue.createVNode(tableGrid["default"], vue.mergeProps({
    "ref": leftTableRef
  }, rest), _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

exports["default"] = LeftTable;
//# sourceMappingURL=left-table.js.map
