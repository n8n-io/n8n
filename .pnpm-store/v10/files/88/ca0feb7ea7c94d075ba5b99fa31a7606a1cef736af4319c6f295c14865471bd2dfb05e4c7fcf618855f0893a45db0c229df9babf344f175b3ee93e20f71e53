import { inject } from 'vue';
import '../../../../hooks/index.mjs';
import { getFixedColumnOffset, ensurePosition, getFixedColumnsClass } from '../util.mjs';
import { TABLE_INJECTION_KEY } from '../tokens.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';

function useStyle(props) {
  const parent = inject(TABLE_INJECTION_KEY);
  const ns = useNamespace("table");
  const getHeaderRowStyle = (rowIndex) => {
    const headerRowStyle = parent == null ? void 0 : parent.props.headerRowStyle;
    if (typeof headerRowStyle === "function") {
      return headerRowStyle.call(null, { rowIndex });
    }
    return headerRowStyle;
  };
  const getHeaderRowClass = (rowIndex) => {
    const classes = [];
    const headerRowClassName = parent == null ? void 0 : parent.props.headerRowClassName;
    if (typeof headerRowClassName === "string") {
      classes.push(headerRowClassName);
    } else if (typeof headerRowClassName === "function") {
      classes.push(headerRowClassName.call(null, { rowIndex }));
    }
    return classes.join(" ");
  };
  const getHeaderCellStyle = (rowIndex, columnIndex, row, column) => {
    var _a;
    let headerCellStyles = (_a = parent == null ? void 0 : parent.props.headerCellStyle) != null ? _a : {};
    if (typeof headerCellStyles === "function") {
      headerCellStyles = headerCellStyles.call(null, {
        rowIndex,
        columnIndex,
        row,
        column
      });
    }
    const fixedStyle = getFixedColumnOffset(columnIndex, column.fixed, props.store, row);
    ensurePosition(fixedStyle, "left");
    ensurePosition(fixedStyle, "right");
    return Object.assign({}, headerCellStyles, fixedStyle);
  };
  const getHeaderCellClass = (rowIndex, columnIndex, row, column) => {
    const fixedClasses = getFixedColumnsClass(ns.b(), columnIndex, column.fixed, props.store, row);
    const classes = [
      column.id,
      column.order,
      column.headerAlign,
      column.className,
      column.labelClassName,
      ...fixedClasses
    ];
    if (!column.children) {
      classes.push("is-leaf");
    }
    if (column.sortable) {
      classes.push("is-sortable");
    }
    const headerCellClassName = parent == null ? void 0 : parent.props.headerCellClassName;
    if (typeof headerCellClassName === "string") {
      classes.push(headerCellClassName);
    } else if (typeof headerCellClassName === "function") {
      classes.push(headerCellClassName.call(null, {
        rowIndex,
        columnIndex,
        row,
        column
      }));
    }
    classes.push(ns.e("cell"));
    return classes.filter((className) => Boolean(className)).join(" ");
  };
  return {
    getHeaderRowStyle,
    getHeaderRowClass,
    getHeaderCellStyle,
    getHeaderCellClass
  };
}

export { useStyle as default };
//# sourceMappingURL=style.helper.mjs.map
