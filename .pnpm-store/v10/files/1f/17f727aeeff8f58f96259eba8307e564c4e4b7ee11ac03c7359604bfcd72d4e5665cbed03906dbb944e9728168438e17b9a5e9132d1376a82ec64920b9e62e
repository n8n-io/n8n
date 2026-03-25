import { computed, unref } from 'vue';
import '../../../../utils/index.mjs';
import { sum, enforceUnit } from '../utils.mjs';
import { isNumber } from '../../../../utils/types.mjs';
import { addUnit } from '../../../../utils/dom/style.mjs';

const useStyles = (props, {
  columnsTotalWidth,
  data,
  fixedColumnsOnLeft,
  fixedColumnsOnRight
}) => {
  const bodyWidth = computed(() => {
    const { fixed, width, vScrollbarSize } = props;
    const ret = width - vScrollbarSize;
    return fixed ? Math.max(Math.round(unref(columnsTotalWidth)), ret) : ret;
  });
  const headerWidth = computed(() => unref(bodyWidth) + (props.fixed ? props.vScrollbarSize : 0));
  const mainTableHeight = computed(() => {
    const { height = 0, maxHeight = 0, footerHeight: footerHeight2, hScrollbarSize } = props;
    if (maxHeight > 0) {
      const _fixedRowsHeight = unref(fixedRowsHeight);
      const _rowsHeight = unref(rowsHeight);
      const _headerHeight = unref(headerHeight);
      const total = _headerHeight + _fixedRowsHeight + _rowsHeight + hScrollbarSize;
      return Math.min(total, maxHeight - footerHeight2);
    }
    return height - footerHeight2;
  });
  const rowsHeight = computed(() => {
    const { rowHeight, estimatedRowHeight } = props;
    const _data = unref(data);
    if (isNumber(estimatedRowHeight)) {
      return _data.length * estimatedRowHeight;
    }
    return _data.length * rowHeight;
  });
  const fixedTableHeight = computed(() => {
    const { maxHeight } = props;
    const tableHeight = unref(mainTableHeight);
    if (isNumber(maxHeight) && maxHeight > 0)
      return tableHeight;
    const totalHeight = unref(rowsHeight) + unref(headerHeight) + unref(fixedRowsHeight);
    return Math.min(tableHeight, totalHeight);
  });
  const mapColumn = (column) => column.width;
  const leftTableWidth = computed(() => sum(unref(fixedColumnsOnLeft).map(mapColumn)));
  const rightTableWidth = computed(() => sum(unref(fixedColumnsOnRight).map(mapColumn)));
  const headerHeight = computed(() => sum(props.headerHeight));
  const fixedRowsHeight = computed(() => {
    var _a;
    return (((_a = props.fixedData) == null ? void 0 : _a.length) || 0) * props.rowHeight;
  });
  const windowHeight = computed(() => {
    return unref(mainTableHeight) - unref(headerHeight) - unref(fixedRowsHeight);
  });
  const rootStyle = computed(() => {
    const { style = {}, height, width } = props;
    return enforceUnit({
      ...style,
      height,
      width
    });
  });
  const footerHeight = computed(() => enforceUnit({ height: props.footerHeight }));
  const emptyStyle = computed(() => ({
    top: addUnit(unref(headerHeight)),
    bottom: addUnit(props.footerHeight),
    width: addUnit(props.width)
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

export { useStyles };
//# sourceMappingURL=use-styles.mjs.map
