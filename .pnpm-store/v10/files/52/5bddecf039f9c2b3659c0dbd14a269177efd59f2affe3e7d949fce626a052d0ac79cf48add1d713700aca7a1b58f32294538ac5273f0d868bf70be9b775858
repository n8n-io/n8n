'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var scrollbar = require('../components/scrollbar.js');
var useGridWheel = require('../hooks/use-grid-wheel.js');
var useCache = require('../hooks/use-cache.js');
var props = require('../props.js');
var utils = require('../utils.js');
var defaults = require('../defaults.js');
var index = require('../../../../hooks/use-namespace/index.js');
var types = require('../../../../utils/types.js');
var scroll = require('../../../../utils/dom/scroll.js');
var shared = require('@vue/shared');
var core = require('@vueuse/core');

const createGrid = ({
  name,
  clearCache,
  getColumnPosition,
  getColumnStartIndexForOffset,
  getColumnStopIndexForStartIndex,
  getEstimatedTotalHeight,
  getEstimatedTotalWidth,
  getColumnOffset,
  getRowOffset,
  getRowPosition,
  getRowStartIndexForOffset,
  getRowStopIndexForStartIndex,
  initCache,
  injectToInstance,
  validateProps
}) => {
  return vue.defineComponent({
    name: name != null ? name : "ElVirtualList",
    props: props.virtualizedGridProps,
    emits: [defaults.ITEM_RENDER_EVT, defaults.SCROLL_EVT],
    setup(props, { emit, expose, slots }) {
      const ns = index.useNamespace("vl");
      validateProps(props);
      const instance = vue.getCurrentInstance();
      const cache = vue.ref(initCache(props, instance));
      injectToInstance == null ? void 0 : injectToInstance(instance, cache);
      const windowRef = vue.ref();
      const hScrollbar = vue.ref();
      const vScrollbar = vue.ref();
      const innerRef = vue.ref(null);
      const states = vue.ref({
        isScrolling: false,
        scrollLeft: types.isNumber(props.initScrollLeft) ? props.initScrollLeft : 0,
        scrollTop: types.isNumber(props.initScrollTop) ? props.initScrollTop : 0,
        updateRequested: false,
        xAxisScrollDir: defaults.FORWARD,
        yAxisScrollDir: defaults.FORWARD
      });
      const getItemStyleCache = useCache.useCache();
      const parsedHeight = vue.computed(() => Number.parseInt(`${props.height}`, 10));
      const parsedWidth = vue.computed(() => Number.parseInt(`${props.width}`, 10));
      const columnsToRender = vue.computed(() => {
        const { totalColumn, totalRow, columnCache } = props;
        const { isScrolling, xAxisScrollDir, scrollLeft } = vue.unref(states);
        if (totalColumn === 0 || totalRow === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getColumnStartIndexForOffset(props, scrollLeft, vue.unref(cache));
        const stopIndex = getColumnStopIndexForStartIndex(props, startIndex, scrollLeft, vue.unref(cache));
        const cacheBackward = !isScrolling || xAxisScrollDir === defaults.BACKWARD ? Math.max(1, columnCache) : 1;
        const cacheForward = !isScrolling || xAxisScrollDir === defaults.FORWARD ? Math.max(1, columnCache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(totalColumn - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const rowsToRender = vue.computed(() => {
        const { totalColumn, totalRow, rowCache } = props;
        const { isScrolling, yAxisScrollDir, scrollTop } = vue.unref(states);
        if (totalColumn === 0 || totalRow === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getRowStartIndexForOffset(props, scrollTop, vue.unref(cache));
        const stopIndex = getRowStopIndexForStartIndex(props, startIndex, scrollTop, vue.unref(cache));
        const cacheBackward = !isScrolling || yAxisScrollDir === defaults.BACKWARD ? Math.max(1, rowCache) : 1;
        const cacheForward = !isScrolling || yAxisScrollDir === defaults.FORWARD ? Math.max(1, rowCache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(totalRow - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const estimatedTotalHeight = vue.computed(() => getEstimatedTotalHeight(props, vue.unref(cache)));
      const estimatedTotalWidth = vue.computed(() => getEstimatedTotalWidth(props, vue.unref(cache)));
      const windowStyle = vue.computed(() => {
        var _a;
        return [
          {
            position: "relative",
            overflow: "hidden",
            WebkitOverflowScrolling: "touch",
            willChange: "transform"
          },
          {
            direction: props.direction,
            height: types.isNumber(props.height) ? `${props.height}px` : props.height,
            width: types.isNumber(props.width) ? `${props.width}px` : props.width
          },
          (_a = props.style) != null ? _a : {}
        ];
      });
      const innerStyle = vue.computed(() => {
        const width = `${vue.unref(estimatedTotalWidth)}px`;
        const height = `${vue.unref(estimatedTotalHeight)}px`;
        return {
          height,
          pointerEvents: vue.unref(states).isScrolling ? "none" : void 0,
          width
        };
      });
      const emitEvents = () => {
        const { totalColumn, totalRow } = props;
        if (totalColumn > 0 && totalRow > 0) {
          const [
            columnCacheStart,
            columnCacheEnd,
            columnVisibleStart,
            columnVisibleEnd
          ] = vue.unref(columnsToRender);
          const [rowCacheStart, rowCacheEnd, rowVisibleStart, rowVisibleEnd] = vue.unref(rowsToRender);
          emit(defaults.ITEM_RENDER_EVT, {
            columnCacheStart,
            columnCacheEnd,
            rowCacheStart,
            rowCacheEnd,
            columnVisibleStart,
            columnVisibleEnd,
            rowVisibleStart,
            rowVisibleEnd
          });
        }
        const {
          scrollLeft,
          scrollTop,
          updateRequested,
          xAxisScrollDir,
          yAxisScrollDir
        } = vue.unref(states);
        emit(defaults.SCROLL_EVT, {
          xAxisScrollDir,
          scrollLeft,
          yAxisScrollDir,
          scrollTop,
          updateRequested
        });
      };
      const onScroll = (e) => {
        const {
          clientHeight,
          clientWidth,
          scrollHeight,
          scrollLeft,
          scrollTop,
          scrollWidth
        } = e.currentTarget;
        const _states = vue.unref(states);
        if (_states.scrollTop === scrollTop && _states.scrollLeft === scrollLeft) {
          return;
        }
        let _scrollLeft = scrollLeft;
        if (utils.isRTL(props.direction)) {
          switch (utils.getRTLOffsetType()) {
            case defaults.RTL_OFFSET_NAG:
              _scrollLeft = -scrollLeft;
              break;
            case defaults.RTL_OFFSET_POS_DESC:
              _scrollLeft = scrollWidth - clientWidth - scrollLeft;
              break;
          }
        }
        states.value = {
          ..._states,
          isScrolling: true,
          scrollLeft: _scrollLeft,
          scrollTop: Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight)),
          updateRequested: true,
          xAxisScrollDir: utils.getScrollDir(_states.scrollLeft, _scrollLeft),
          yAxisScrollDir: utils.getScrollDir(_states.scrollTop, scrollTop)
        };
        vue.nextTick(() => resetIsScrolling());
        onUpdated();
        emitEvents();
      };
      const onVerticalScroll = (distance, totalSteps) => {
        const height = vue.unref(parsedHeight);
        const offset = (estimatedTotalHeight.value - height) / totalSteps * distance;
        scrollTo({
          scrollTop: Math.min(estimatedTotalHeight.value - height, offset)
        });
      };
      const onHorizontalScroll = (distance, totalSteps) => {
        const width = vue.unref(parsedWidth);
        const offset = (estimatedTotalWidth.value - width) / totalSteps * distance;
        scrollTo({
          scrollLeft: Math.min(estimatedTotalWidth.value - width, offset)
        });
      };
      const { onWheel } = useGridWheel.useGridWheel({
        atXStartEdge: vue.computed(() => states.value.scrollLeft <= 0),
        atXEndEdge: vue.computed(() => states.value.scrollLeft >= estimatedTotalWidth.value - vue.unref(parsedWidth)),
        atYStartEdge: vue.computed(() => states.value.scrollTop <= 0),
        atYEndEdge: vue.computed(() => states.value.scrollTop >= estimatedTotalHeight.value - vue.unref(parsedHeight))
      }, (x, y) => {
        var _a, _b, _c, _d;
        (_b = (_a = hScrollbar.value) == null ? void 0 : _a.onMouseUp) == null ? void 0 : _b.call(_a);
        (_d = (_c = vScrollbar.value) == null ? void 0 : _c.onMouseUp) == null ? void 0 : _d.call(_c);
        const width = vue.unref(parsedWidth);
        const height = vue.unref(parsedHeight);
        scrollTo({
          scrollLeft: Math.min(states.value.scrollLeft + x, estimatedTotalWidth.value - width),
          scrollTop: Math.min(states.value.scrollTop + y, estimatedTotalHeight.value - height)
        });
      });
      const scrollTo = ({
        scrollLeft = states.value.scrollLeft,
        scrollTop = states.value.scrollTop
      }) => {
        scrollLeft = Math.max(scrollLeft, 0);
        scrollTop = Math.max(scrollTop, 0);
        const _states = vue.unref(states);
        if (scrollTop === _states.scrollTop && scrollLeft === _states.scrollLeft) {
          return;
        }
        states.value = {
          ..._states,
          xAxisScrollDir: utils.getScrollDir(_states.scrollLeft, scrollLeft),
          yAxisScrollDir: utils.getScrollDir(_states.scrollTop, scrollTop),
          scrollLeft,
          scrollTop,
          updateRequested: true
        };
        vue.nextTick(() => resetIsScrolling());
        onUpdated();
        emitEvents();
      };
      const scrollToItem = (rowIndex = 0, columnIdx = 0, alignment = defaults.AUTO_ALIGNMENT) => {
        const _states = vue.unref(states);
        columnIdx = Math.max(0, Math.min(columnIdx, props.totalColumn - 1));
        rowIndex = Math.max(0, Math.min(rowIndex, props.totalRow - 1));
        const scrollBarWidth = scroll.getScrollBarWidth(ns.namespace.value);
        const _cache = vue.unref(cache);
        const estimatedHeight = getEstimatedTotalHeight(props, _cache);
        const estimatedWidth = getEstimatedTotalWidth(props, _cache);
        scrollTo({
          scrollLeft: getColumnOffset(props, columnIdx, alignment, _states.scrollLeft, _cache, estimatedWidth > props.width ? scrollBarWidth : 0),
          scrollTop: getRowOffset(props, rowIndex, alignment, _states.scrollTop, _cache, estimatedHeight > props.height ? scrollBarWidth : 0)
        });
      };
      const getItemStyle = (rowIndex, columnIndex) => {
        const { columnWidth, direction, rowHeight } = props;
        const itemStyleCache = getItemStyleCache.value(clearCache && columnWidth, clearCache && rowHeight, clearCache && direction);
        const key = `${rowIndex},${columnIndex}`;
        if (shared.hasOwn(itemStyleCache, key)) {
          return itemStyleCache[key];
        } else {
          const [, left] = getColumnPosition(props, columnIndex, vue.unref(cache));
          const _cache = vue.unref(cache);
          const rtl = utils.isRTL(direction);
          const [height, top] = getRowPosition(props, rowIndex, _cache);
          const [width] = getColumnPosition(props, columnIndex, _cache);
          itemStyleCache[key] = {
            position: "absolute",
            left: rtl ? void 0 : `${left}px`,
            right: rtl ? `${left}px` : void 0,
            top: `${top}px`,
            height: `${height}px`,
            width: `${width}px`
          };
          return itemStyleCache[key];
        }
      };
      const resetIsScrolling = () => {
        states.value.isScrolling = false;
        vue.nextTick(() => {
          getItemStyleCache.value(-1, null, null);
        });
      };
      vue.onMounted(() => {
        if (!core.isClient)
          return;
        const { initScrollLeft, initScrollTop } = props;
        const windowElement = vue.unref(windowRef);
        if (windowElement) {
          if (types.isNumber(initScrollLeft)) {
            windowElement.scrollLeft = initScrollLeft;
          }
          if (types.isNumber(initScrollTop)) {
            windowElement.scrollTop = initScrollTop;
          }
        }
        emitEvents();
      });
      const onUpdated = () => {
        const { direction } = props;
        const { scrollLeft, scrollTop, updateRequested } = vue.unref(states);
        const windowElement = vue.unref(windowRef);
        if (updateRequested && windowElement) {
          if (direction === defaults.RTL) {
            switch (utils.getRTLOffsetType()) {
              case defaults.RTL_OFFSET_NAG: {
                windowElement.scrollLeft = -scrollLeft;
                break;
              }
              case defaults.RTL_OFFSET_POS_ASC: {
                windowElement.scrollLeft = scrollLeft;
                break;
              }
              default: {
                const { clientWidth, scrollWidth } = windowElement;
                windowElement.scrollLeft = scrollWidth - clientWidth - scrollLeft;
                break;
              }
            }
          } else {
            windowElement.scrollLeft = Math.max(0, scrollLeft);
          }
          windowElement.scrollTop = Math.max(0, scrollTop);
        }
      };
      const { resetAfterColumnIndex, resetAfterRowIndex, resetAfter } = instance.proxy;
      expose({
        windowRef,
        innerRef,
        getItemStyleCache,
        scrollTo,
        scrollToItem,
        states,
        resetAfterColumnIndex,
        resetAfterRowIndex,
        resetAfter
      });
      const renderScrollbars = () => {
        const {
          scrollbarAlwaysOn,
          scrollbarStartGap,
          scrollbarEndGap,
          totalColumn,
          totalRow
        } = props;
        const width = vue.unref(parsedWidth);
        const height = vue.unref(parsedHeight);
        const estimatedWidth = vue.unref(estimatedTotalWidth);
        const estimatedHeight = vue.unref(estimatedTotalHeight);
        const { scrollLeft, scrollTop } = vue.unref(states);
        const horizontalScrollbar = vue.h(scrollbar["default"], {
          ref: hScrollbar,
          alwaysOn: scrollbarAlwaysOn,
          startGap: scrollbarStartGap,
          endGap: scrollbarEndGap,
          class: ns.e("horizontal"),
          clientSize: width,
          layout: "horizontal",
          onScroll: onHorizontalScroll,
          ratio: width * 100 / estimatedWidth,
          scrollFrom: scrollLeft / (estimatedWidth - width),
          total: totalRow,
          visible: true
        });
        const verticalScrollbar = vue.h(scrollbar["default"], {
          ref: vScrollbar,
          alwaysOn: scrollbarAlwaysOn,
          startGap: scrollbarStartGap,
          endGap: scrollbarEndGap,
          class: ns.e("vertical"),
          clientSize: height,
          layout: "vertical",
          onScroll: onVerticalScroll,
          ratio: height * 100 / estimatedHeight,
          scrollFrom: scrollTop / (estimatedHeight - height),
          total: totalColumn,
          visible: true
        });
        return {
          horizontalScrollbar,
          verticalScrollbar
        };
      };
      const renderItems = () => {
        var _a;
        const [columnStart, columnEnd] = vue.unref(columnsToRender);
        const [rowStart, rowEnd] = vue.unref(rowsToRender);
        const { data, totalColumn, totalRow, useIsScrolling, itemKey } = props;
        const children = [];
        if (totalRow > 0 && totalColumn > 0) {
          for (let row = rowStart; row <= rowEnd; row++) {
            for (let column = columnStart; column <= columnEnd; column++) {
              children.push((_a = slots.default) == null ? void 0 : _a.call(slots, {
                columnIndex: column,
                data,
                key: itemKey({ columnIndex: column, data, rowIndex: row }),
                isScrolling: useIsScrolling ? vue.unref(states).isScrolling : void 0,
                style: getItemStyle(row, column),
                rowIndex: row
              }));
            }
          }
        }
        return children;
      };
      const renderInner = () => {
        const Inner = vue.resolveDynamicComponent(props.innerElement);
        const children = renderItems();
        return [
          vue.h(Inner, {
            style: vue.unref(innerStyle),
            ref: innerRef
          }, !shared.isString(Inner) ? {
            default: () => children
          } : children)
        ];
      };
      const renderWindow = () => {
        const Container = vue.resolveDynamicComponent(props.containerElement);
        const { horizontalScrollbar, verticalScrollbar } = renderScrollbars();
        const Inner = renderInner();
        return vue.h("div", {
          key: 0,
          class: ns.e("wrapper"),
          role: props.role
        }, [
          vue.h(Container, {
            class: props.className,
            style: vue.unref(windowStyle),
            onScroll,
            onWheel,
            ref: windowRef
          }, !shared.isString(Container) ? { default: () => Inner } : Inner),
          horizontalScrollbar,
          verticalScrollbar
        ]);
      };
      return renderWindow;
    }
  });
};

exports["default"] = createGrid;
//# sourceMappingURL=build-grid.js.map
