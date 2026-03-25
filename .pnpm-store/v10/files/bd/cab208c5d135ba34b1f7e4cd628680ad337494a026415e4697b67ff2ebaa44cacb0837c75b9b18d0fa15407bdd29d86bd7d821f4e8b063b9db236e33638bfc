'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var utils = require('../utils.js');
var types = require('../../../../utils/types.js');
var style = require('../../../../utils/dom/style.js');

const useStyles = (props, {
  columnsTotalWidth,
  data,
  fixedColumnsOnLeft,
  fixedColumnsOnRight
}) => {
  const bodyWidth = vue.computed(() => {
    const { fixed, width, vScrollbarSize } = props;
    const ret = width - vScrollbarSize;
    return fixed ? Math.max(Math.round(vue.unref(columnsTotalWidth)), ret) : ret;
  });
  const headerWidth = vue.computed(() => vue.unref(bodyWidth) + (props.fixed ? props.vScrollbarSize : 0));
  const mainTableHeight = vue.computed(() => {
    const { height = 0, maxHeight = 0, footerHeight: footerHeight2, hScrollbarSize } = props;
    if (maxHeight > 0) {
      const _fixedRowsHeight = vue.unref(fixedRowsHeight);
      const _rowsHeight = vue.unref(rowsHeight);
      const _headerHeight = vue.unref(headerHeight);
      const total = _headerHeight + _fixedRowsHeight + _rowsHeight + hScrollbarSize;
      return Math.min(total, maxHeight - footerHeight2);
    }
    return height - footerHeight2;
  });
  const rowsHeight = vue.computed(() => {
    const { rowHeight, estimatedRowHeight } = props;
    const _data = vue.unref(data);
    if (types.isNumber(estimatedRowHeight)) {
      return _data.length * estimatedRowHeight;
    }
    return _data.length * rowHeight;
  });
  const fixedTableHeight = vue.computed(() => {
    const { maxHeight } = props;
    const tableHeight = vue.unref(mainTableHeight);
    if (types.isNumber(maxHeight) && maxHeight > 0)
      return tableHeight;
    const totalHeight = vue.unref(rowsHeight) + vue.unref(headerHeight) + vue.unref(fixedRowsHeight);
    return Math.min(tableHeight, totalHeight);
  });
  const mapColumn = (column) => column.width;
  const leftTableWidth = vue.computed(() => utils.sum(vue.unref(fixedColumnsOnLeft).map(mapColumn)));
  const rightTableWidth = vue.computed(() => utils.sum(vue.unref(fixedColumnsOnRight).map(mapColumn)));
  const headerHeight = vue.computed(() => utils.sum(props.headerHeight));
  const fixedRowsHeight = vue.computed(() => {
    var _a;
    return (((_a = props.fixedData) == null ? void 0 : _a.length) || 0) * props.rowHeight;
  });
  const windowHeight = vue.computed(() => {
    return vue.unref(mainTableHeight) - vue.unref(headerHeight) - vue.unref(fixedRowsHeight);
  });
  const rootStyle = vue.computed(() => {
    const { style = {}, height, width } = props;
    return utils.enforceUnit({
      ...style,
      height,
      width
    });
  });
  const footerHeight = vue.computed(() => utils.enforceUnit({ height: props.footerHeight }));
  const emptyStyle = vue.computed(() => ({
    top: style.addUnit(vue.unref(headerHeight)),
    bottom: style.addUnit(props.footerHeight),
    width: style.addUnit(props.width)
  }));
  return {
    bodyWidth,
    fixedTableHeight,
    mainTableHeight,
    leftTableWidth,
    rightTableWidth,
    headerWidth,
    rowsHeight,
    windowHeight,
    footerHeight,
    emptyStyle,
    rootStyle,
    headerHeight
  };
};

exports.useStyles = useStyles;
//# sourceMappingURL=use-styles.js.map
