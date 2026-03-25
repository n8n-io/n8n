'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var constants = require('../constants.js');
var _private = require('../private.js');
var utils = require('./utils.js');
var shared = require('@vue/shared');

function useColumns(props, columns, fixed) {
  const visibleColumns = vue.computed(() => {
    return vue.unref(columns).filter((column) => !column.hidden);
  });
  const fixedColumnsOnLeft = vue.computed(() => vue.unref(visibleColumns).filter((column) => column.fixed === "left" || column.fixed === true));
  const fixedColumnsOnRight = vue.computed(() => vue.unref(visibleColumns).filter((column) => column.fixed === "right"));
  const normalColumns = vue.computed(() => vue.unref(visibleColumns).filter((column) => !column.fixed));
  const mainColumns = vue.computed(() => {
    const ret = [];
    vue.unref(fixedColumnsOnLeft).forEach((column) => {
      ret.push({
        ...column,
        placeholderSign: _private.placeholderSign
      });
    });
    vue.unref(normalColumns).forEach((column) => {
      ret.push(column);
    });
    vue.unref(fixedColumnsOnRight).forEach((column) => {
      ret.push({
        ...column,
        placeholderSign: _private.placeholderSign
      });
    });
    return ret;
  });
  const hasFixedColumns = vue.computed(() => {
    return vue.unref(fixedColumnsOnLeft).length || vue.unref(fixedColumnsOnRight).length;
  });
  const columnsStyles = vue.computed(() => {
    const _columns = vue.unref(columns);
    return _columns.reduce((style, column) => {
      style[column.key] = utils.calcColumnStyle(column, vue.unref(fixed), props.fixed);
      return style;
    }, {});
  });
  const columnsTotalWidth = vue.computed(() => {
    return vue.unref(visibleColumns).reduce((width, column) => width + column.width, 0);
  });
  const getColumn = (key) => {
    return vue.unref(columns).find((column) => column.key === key);
  };
  const getColumnStyle = (key) => {
    return vue.unref(columnsStyles)[key];
  };
  const updateColumnWidth = (column, width) => {
    column.width = width;
  };
  function onColumnSorted(e) {
    var _a;
    const { key } = e.currentTarget.dataset;
    if (!key)
      return;
    const { sortState, sortBy } = props;
    let order = constants.SortOrder.ASC;
    if (shared.isObject(sortState)) {
      order = constants.oppositeOrderMap[sortState[key]];
    } else {
      order = constants.oppositeOrderMap[sortBy.order];
    }
    (_a = props.onColumnSort) == null ? void 0 : _a.call(props, { column: getColumn(key), key, order });
  }
  return {
    columns,
    columnsStyles,
    columnsTotalWidth,
    fixedColumnsOnLeft,
    fixedColumnsOnRight,
    hasFixedColumns,
    mainColumns,
    normalColumns,
    visibleColumns,
    getColumn,
    getColumnStyle,
    updateColumnWidth,
    onColumnSorted
  };
}

exports.useColumns = useColumns;
//# sourceMappingURL=use-columns.js.map
