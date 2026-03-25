'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../components/index.js');
var utils = require('../utils.js');
var headerRow = require('../components/header-row.js');

function _isSlot(s) {
  return typeof s === "function" || Object.prototype.toString.call(s) === "[object Object]" && !vue.isVNode(s);
}
const HeaderRenderer = ({
  columns,
  columnsStyles,
  headerIndex,
  style,
  headerClass,
  headerProps,
  ns
}, {
  slots
}) => {
  const param = {
    columns,
    headerIndex
  };
  const kls = [ns.e("header-row"), utils.tryCall(headerClass, param, ""), {
    [ns.is("customized")]: Boolean(slots.header)
  }];
  const extraProps = {
    ...utils.tryCall(headerProps, param),
    columnsStyles,
    class: kls,
    columns,
    headerIndex,
    style
  };
  return vue.createVNode(headerRow["default"], extraProps, _isSlot(slots) ? slots : {
    default: () => [slots]
  });
};

exports["default"] = HeaderRenderer;
//# sourceMappingURL=header.js.map
