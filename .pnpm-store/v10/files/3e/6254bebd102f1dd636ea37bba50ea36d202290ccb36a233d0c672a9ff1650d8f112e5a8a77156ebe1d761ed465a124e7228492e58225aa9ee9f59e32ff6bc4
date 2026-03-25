'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var tableGrid = require('../table-grid.js');

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !vue.isVNode(s);
}
const MainTable = (props, {
  slots
}) => {
  const {
    mainTableRef,
    ...rest
  } = props;
  return vue.createVNode(tableGrid["default"], vue.mergeProps({
    "ref": mainTableRef
  }, rest), _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

exports["default"] = MainTable;
//# sourceMappingURL=main-table.js.map
