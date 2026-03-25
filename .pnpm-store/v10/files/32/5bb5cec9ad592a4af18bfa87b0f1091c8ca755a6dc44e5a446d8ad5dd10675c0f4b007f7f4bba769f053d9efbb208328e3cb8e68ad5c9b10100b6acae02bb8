import { computed, unref } from 'vue';
import '../../../../utils/index.mjs';
import { SortOrder, oppositeOrderMap } from '../constants.mjs';
import { placeholderSign } from '../private.mjs';
import { calcColumnStyle } from './utils.mjs';
import { isObject } from '@vue/shared';

function useColumns(props, columns, fixed) {
  const visibleColumns = computed(() => {
    return unref(columns).filter((column) => !column.hidden);
  });
  const fixedColumnsOnLeft = computed(() => unref(visibleColumns).filter((column) => column.fixed === "left" || column.fixed === true));
  const fixedColumnsOnRight = computed(() => unref(visibleColumns).filter((column) => column.fixed === "right"));
  const normalColumns = computed(() => unref(visibleColumns).filter((column) => !column.fixed));
  const mainColumns = computed(() => {
    const ret = [];
    unref(fixedColumnsOnLeft).forEach((column) => {
      ret.push({
        ...column,
        placeholderSign
      });
    });
    unref(normalColumns).forEach((column) => {
      ret.push(column);
    });
    unref(fixedColumnsOnRight).forEach((column) => {
      ret.push({
        ...column,
        placeholderSign
      });
    });
    return ret;
  });
  const hasFixedColumns = computed(() => {
    return unref(fixedColumnsOnLeft).length || unref(fixedColumnsOnRight).length;
  });
  const columnsStyles = computed(() => {
    const _columns = unref(columns);
    return _columns.reduce((style, column) => {
      style[column.key] = calcColumnStyle(column, unref(fixed), props.fixed);
      return style;
    }, {});
  });
  const columnsTotalWidth = computed(() => {
    return unref(visibleColumns).reduce((width, column) => width + column.width, 0);
  });
  const getColumn = (key) => {
    return unref(columns).find((column) => column.key === key);
  };
  const getColumnStyle = (key) => {
    return unref(columnsStyles)[key];
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
    let order = SortOrder.ASC;
    if (isObject(sortState)) {
      order = oppositeOrderMap[sortState[key]];
    } else {
      order = oppositeOrderMap[sortBy.order];
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

export { useColumns };
//# sourceMappingURL=use-columns.mjs.map
