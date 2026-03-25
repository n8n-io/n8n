'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const TableV2Cell = (props, {
  slots
}) => {
  var _a;
  const {
    cellData,
    style
  } = props;
  const displayText = ((_a = cellData == null ? void 0 : cellData.toString) == null ? void 0 : _a.call(cellData)) || "";
  return vue.createVNode("div", {
    "class": props.class,
    "title": displayText,
    "style": style
  }, [slots.default ? slots.default(props) : displayText]);
};
TableV2Cell.displayName = "ElTableV2Cell";
TableV2Cell.inheritAttrs = false;

exports["default"] = TableV2Cell;
//# sourceMappingURL=cell.js.map
