const calcColumnStyle = (column, fixedColumn, fixed) => {
  var _a;
  const flex = {
    flexGrow: 0,
    flexShrink: 0,
    ...fixed ? {} : {
      flexGrow: column.flexGrow || 0,
      flexShrink: column.flexShrink || 1
    }
  };
  if (!fixed) {
    flex.flexShrink = 1;
  }
  const style = {
    ...(_a = column.style) != null ? _a : {},
    ...flex,
    flexBasis: "auto",
    width: column.width
  };
  if (!fixedColumn) {
    if (column.maxWidth)
      style.maxWidth = column.maxWidth;
    if (column.minWidth)
      style.minWidth = column.minWidth;
  }
  return style;
};

export { calcColumnStyle };
//# sourceMappingURL=utils.mjs.map
