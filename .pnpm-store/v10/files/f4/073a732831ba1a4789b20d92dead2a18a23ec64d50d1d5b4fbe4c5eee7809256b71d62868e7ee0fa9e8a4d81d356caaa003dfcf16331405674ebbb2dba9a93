'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../form/index.js');
var useFormCommonProps = require('../../../form/src/hooks/use-form-common-props.js');

function useStyle(props, layout, store, table) {
  const isHidden = vue.ref(false);
  const renderExpanded = vue.ref(null);
  const resizeProxyVisible = vue.ref(false);
  const setDragVisible = (visible) => {
    resizeProxyVisible.value = visible;
  };
  const resizeState = vue.ref({
    width: null,
    height: null,
    headerHeight: null
  });
  const isGroup = vue.ref(false);
  const scrollbarViewStyle = {
    display: "inline-block",
    verticalAlign: "middle"
  };
  const tableWidth = vue.ref();
  const tableScrollHeight = vue.ref(0);
  const bodyScrollHeight = vue.ref(0);
  const headerScrollHeight = vue.ref(0);
  const footerScrollHeight = vue.ref(0);
  const appendScrollHeight = vue.ref(0);
  vue.watchEffect(() => {
    layout.setHeight(props.height);
  });
  vue.watchEffect(() => {
    layout.setMaxHeight(props.maxHeight);
  });
  vue.watch(() => [props.currentRowKey, store.states.rowKey], ([currentRowKey, rowKey]) => {
    if (!vue.unref(rowKey) || !vue.unref(currentRowKey))
      return;
    store.setCurrentRowKey(`${currentRowKey}`);
  }, {
    immediate: true
  });
  vue.watch(() => props.data, (data) => {
    table.store.commit("setData", data);
  }, {
    immediate: true,
    deep: true
  });
  vue.watchEffect(() => {
    if (props.expandRowKeys) {
      store.setExpandRowKeysAdapter(props.expandRowKeys);
    }
  });
  const handleMouseLeave = () => {
    table.store.commit("setHoverRow", null);
    if (table.hoverState)
      table.hoverState = null;
  };
  const handleHeaderFooterMousewheel = (event, data) => {
    const { pixelX, pixelY } = data;
    if (Math.abs(pixelX) >= Math.abs(pixelY)) {
      table.refs.bodyWrapper.scrollLeft += data.pixelX / 5;
    }
  };
  const shouldUpdateHeight = vue.computed(() => {
    return props.height || props.maxHeight || store.states.fixedColumns.value.length > 0 || store.states.rightFixedColumns.value.length > 0;
  });
  const tableBodyStyles = vue.computed(() => {
    return {
      width: layout.bodyWidth.value ? `${layout.bodyWidth.value}px` : ""
    };
  });
  const doLayout = () => {
    if (shouldUpdateHeight.value) {
      layout.updateElsHeight();
    }
    layout.updateColumnsWidth();
    requestAnimationFrame(syncPosition);
  };
  vue.onMounted(async () => {
    await vue.nextTick();
    store.updateColumns();
    bindEvents();
    requestAnimationFrame(doLayout);
    const el = table.vnode.el;
    const tableHeader = table.refs.headerWrapper;
    if (props.flexible && el && el.parentElement) {
      el.parentElement.style.minWidth = "0";
    }
    resizeState.value = {
      width: tableWidth.value = el.offsetWidth,
      height: el.offsetHeight,
      headerHeight: props.showHeader && tableHeader ? tableHeader.offsetHeight : null
    };
    store.states.columns.value.forEach((column) => {
      if (column.filteredValue && column.filteredValue.length) {
        table.store.commit("filterChange", {
          column,
          values: column.filteredValue,
          silent: true
        });
      }
    });
    table.$ready = true;
  });
  const setScrollClassByEl = (el, className) => {
    if (!el)
      return;
    const classList = Array.from(el.classList).filter((item) => !item.startsWith("is-scrolling-"));
    classList.push(layout.scrollX.value ? className : "is-scrolling-none");
    el.className = classList.join(" ");
  };
  const setScrollClass = (className) => {
    const { tableWrapper } = table.refs;
    setScrollClassByEl(tableWrapper, className);
  };
  const hasScrollClass = (className) => {
    const { tableWrapper } = table.refs;
    return !!(tableWrapper && tableWrapper.classList.contains(className));
  };
  const syncPosition = function() {
    if (!table.refs.scrollBarRef)
      return;
    if (!layout.scrollX.value) {
      const scrollingNoneClass = "is-scrolling-none";
      if (!hasScrollClass(scrollingNoneClass)) {
        setScrollClass(scrollingNoneClass);
      }
      return;
    }
    const scrollContainer = table.refs.scrollBarRef.wrapRef;
    if (!scrollContainer)
      return;
    const { scrollLeft, offsetWidth, scrollWidth } = scrollContainer;
    const { headerWrapper, footerWrapper } = table.refs;
    if (headerWrapper)
      headerWrapper.scrollLeft = scrollLeft;
    if (footerWrapper)
      footerWrapper.scrollLeft = scrollLeft;
    const maxScrollLeftPosition = scrollWidth - offsetWidth - 1;
    if (scrollLeft >= maxScrollLeftPosition) {
      setScrollClass("is-scrolling-right");
    } else if (scrollLeft === 0) {
      setScrollClass("is-scrolling-left");
    } else {
      setScrollClass("is-scrolling-middle");
    }
  };
  const bindEvents = () => {
    if (!table.refs.scrollBarRef)
      return;
    if (table.refs.scrollBarRef.wrapRef) {
      core.useEventListener(table.refs.scrollBarRef.wrapRef, "scroll", syncPosition, {
        passive: true
      });
    }
    if (props.fit) {
      core.useResizeObserver(table.vnode.el, resizeListener);
    } else {
      core.useEventListener(window, "resize", resizeListener);
    }
    core.useResizeObserver(table.refs.bodyWrapper, () => {
      var _a, _b;
      resizeListener();
      (_b = (_a = table.refs) == null ? void 0 : _a.scrollBarRef) == null ? void 0 : _b.update();
    });
  };
  const resizeListener = () => {
    var _a, _b, _c, _d;
    const el = table.vnode.el;
    if (!table.$ready || !el)
      return;
    let shouldUpdateLayout = false;
    const {
      width: oldWidth,
      height: oldHeight,
      headerHeight: oldHeaderHeight
    } = resizeState.value;
    const width = tableWidth.value = el.offsetWidth;
    if (oldWidth !== width) {
      shouldUpdateLayout = true;
    }
    const height = el.offsetHeight;
    if ((props.height || shouldUpdateHeight.value) && oldHeight !== height) {
      shouldUpdateLayout = true;
    }
    const tableHeader = props.tableLayout === "fixed" ? table.refs.headerWrapper : (_a = table.refs.tableHeaderRef) == null ? void 0 : _a.$el;
    if (props.showHeader && (tableHeader == null ? void 0 : tableHeader.offsetHeight) !== oldHeaderHeight) {
      shouldUpdateLayout = true;
    }
    tableScrollHeight.value = ((_b = table.refs.tableWrapper) == null ? void 0 : _b.scrollHeight) || 0;
    headerScrollHeight.value = (tableHeader == null ? void 0 : tableHeader.scrollHeight) || 0;
    footerScrollHeight.value = ((_c = table.refs.footerWrapper) == null ? void 0 : _c.offsetHeight) || 0;
    appendScrollHeight.value = ((_d = table.refs.appendWrapper) == null ? void 0 : _d.offsetHeight) || 0;
    bodyScrollHeight.value = tableScrollHeight.value - headerScrollHeight.value - footerScrollHeight.value - appendScrollHeight.value;
    if (shouldUpdateLayout) {
      resizeState.value = {
        width,
        height,
        headerHeight: props.showHeader && (tableHeader == null ? void 0 : tableHeader.offsetHeight) || 0
      };
      doLayout();
    }
  };
  const tableSize = useFormCommonProps.useFormSize();
  const bodyWidth = vue.computed(() => {
    const { bodyWidth: bodyWidth_, scrollY, gutterWidth } = layout;
    return bodyWidth_.value ? `${bodyWidth_.value - (scrollY.value ? gutterWidth : 0)}px` : "";
  });
  const tableLayout = vue.computed(() => {
    if (props.maxHeight)
      return "fixed";
    return props.tableLayout;
  });
  const emptyBlockStyle = vue.computed(() => {
    if (props.data && props.data.length)
      return null;
    let height = "100%";
    if (props.height && bodyScrollHeight.value) {
      height = `${bodyScrollHeight.value}px`;
    }
    const width = tableWidth.value;
    return {
      width: width ? `${width}px` : "",
      height
    };
  });
  const tableInnerStyle = vue.computed(() => {
    if (props.height) {
      return {
        height: !Number.isNaN(Number(props.height)) ? `${props.height}px` : props.height
      };
    }
    if (props.maxHeight) {
      return {
        maxHeight: !Number.isNaN(Number(props.maxHeight)) ? `${props.maxHeight}px` : props.maxHeight
      };
    }
    return {};
  });
  const scrollbarStyle = vue.computed(() => {
    if (props.height) {
      return {
        height: "100%"
      };
    }
    if (props.maxHeight) {
      if (!Number.isNaN(Number(props.maxHeight))) {
        return {
          maxHeight: `${props.maxHeight - headerScrollHeight.value - footerScrollHeight.value}px`
        };
      } else {
        return {
          maxHeight: `calc(${props.maxHeight} - ${headerScrollHeight.value + footerScrollHeight.value}px)`
        };
      }
    }
    return {};
  });
  const handleFixedMousewheel = (event, data) => {
    const bodyWrapper = table.refs.bodyWrapper;
    if (Math.abs(data.spinY) > 0) {
      const currentScrollTop = bodyWrapper.scrollTop;
      if (data.pixelY < 0 && currentScrollTop !== 0) {
        event.preventDefault();
      }
      if (data.pixelY > 0 && bodyWrapper.scrollHeight - bodyWrapper.clientHeight > currentScrollTop) {
        event.preventDefault();
      }
      bodyWrapper.scrollTop += Math.ceil(data.pixelY / 5);
    } else {
      bodyWrapper.scrollLeft += Math.ceil(data.pixelX / 5);
    }
  };
  return {
    isHidden,
    renderExpanded,
    setDragVisible,
    isGroup,
    handleMouseLeave,
    handleHeaderFooterMousewheel,
    tableSize,
    emptyBlockStyle,
    handleFixedMousewheel,
    resizeProxyVisible,
    bodyWidth,
    resizeState,
    doLayout,
    tableBodyStyles,
    tableLayout,
    scrollbarViewStyle,
    tableInnerStyle,
    scrollbarStyle
  };
}

exports["default"] = useStyle;
//# sourceMappingURL=style-helper.js.map
