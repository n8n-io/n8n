'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../hooks/index.js');
var util = require('../util.js');
var mapStateHelper = require('./mapState-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');

function useStyle(props) {
  const { columns } = mapStateHelper["default"]();
  const ns = index.useNamespace("table");
  const getCellClasses = (columns2, cellIndex) => {
    const column = columns2[cellIndex];
    const classes = [
      ns.e("cell"),
      column.id,
      column.align,
      column.labelClassName,
      ...util.getFixedColumnsClass(ns.b(), cellIndex, column.fixed, props.store)
    ];
    if (column.className) {
      classes.push(column.className);
    }
    if (!column.children) {
      classes.push(ns.is("leaf"));
    }
    return classes;
  };
  const getCellStyles = (column, cellIndex) => {
    const fixedStyle = util.getFixedColumnOffset(cellIndex, column.fixed, props.store);
    util.ensurePosition(fixedStyle, "left");
    util.ensurePosition(fixedStyle, "right");
    return fixedStyle;
  };
  return {
    getCellClasses,
    getCellStyles,
    columns
  };
}

exports["default"] = useStyle;
//# sourceMappingURL=style-helper.js.map
