import { defineComponent, getCurrentInstance, ref, computed, unref, nextTick, onMounted, h, resolveDynamicComponent } from 'vue';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import ScrollBar from '../components/scrollbar.mjs';
import { useGridWheel } from '../hooks/use-grid-wheel.mjs';
import { useCache } from '../hooks/use-cache.mjs';
import { virtualizedGridProps } from '../props.mjs';
import { isRTL, getRTLOffsetType, getScrollDir } from '../utils.mjs';
import { ITEM_RENDER_EVT, SCROLL_EVT, FORWARD, BACKWARD, RTL_OFFSET_POS_DESC, RTL_OFFSET_NAG, AUTO_ALIGNMENT, RTL, RTL_OFFSET_POS_ASC } from '../defaults.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { isNumber } from '../../../../utils/types.mjs';
import { getScrollBarWidth } from '../../../../utils/dom/scroll.mjs';
import { hasOwn, isString } from '@vue/shared';
import { isClient } from '@vueuse/core';

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
  return defineComponent({
    name: name != null ? name : "ElVirtualList",
    props: virtualizedGridProps,
    emits: [ITEM_RENDER_EVT, SCROLL_EVT],
    setup(props, { emit, expose, slots }) {
      const ns = useNamespace("vl");
      validateProps(props);
      const instance = getCurrentInstance();
      const cache = ref(initCache(props, instance));
      injectToInstance == null ? void 0 : injectToInstance(instance, cache);
      const windowRef = ref();
      const hScrollbar = ref();
      const vScrollbar = ref();
      const innerRef = ref(null);
      const states = ref({
        isScrolling: false,
        scrollLeft: isNumber(props.initScrollLeft) ? props.initScrollLeft : 0,
        scrollTop: isNumber(props.initScrollTop) ? props.initScrollTop : 0,
        updateRequested: false,
        xAxisScrollDir: FORWARD,
        yAxisScrollDir: FORWARD
      });
      const getItemStyleCache = useCache();
      const parsedHeight = computed(() => Number.parseInt(`${props.height}`, 10));
      const parsedWidth = computed(() => Number.parseInt(`${props.width}`, 10));
      const columnsToRender = computed(() => {
        const { totalColumn, totalRow, columnCache } = props;
        const { isScrolling, xAxisScrollDir, scrollLeft } = unref(states);
        if (totalColumn === 0 || totalRow === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getColumnStartIndexForOffset(props, scrollLeft, unref(cache));
        const stopIndex = getColumnStopIndexForStartIndex(props, startIndex, scrollLeft, unref(cache));
        const cacheBackward = !isScrolling || xAxisScrollDir === BACKWARD ? Math.max(1, columnCache) : 1;
        const cacheForward = !isScrolling || xAxisScrollDir === FORWARD ? Math.max(1, columnCache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(totalColumn - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const rowsToRender = computed(() => {
        const { totalColumn, totalRow, rowCache } = props;
        const { isScrolling, yAxisScrollDir, scrollTop } = unref(states);
        if (totalColumn === 0 || totalRow === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getRowStartIndexForOffset(props, scrollTop, unref(cache));
        const stopIndex = getRowStopIndexForStartIndex(props, startIndex, scrollTop, unref(cache));
        const cacheBackward = !isScrolling || yAxisScrollDir === BACKWARD ? Math.max(1, rowCache) : 1;
        const cacheForward = !isScrolling || yAxisScrollDir === FORWARD ? Math.max(1, rowCache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(totalRow - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const estimatedTotalHeight = computed(() => getEstimatedTotalHeight(props, unref(cache)));
      const estimatedTotalWidth = computed(() => getEstimatedTotalWidth(props, unref(cache)));
      const windowStyle = computed(() => {
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
            height: isNumber(props.height) ? `${props.height}px` : props.height,
            width: isNumber(props.width) ? `${props.width}px` : props.width
          },
          (_a = props.style) != null ? _a : {}
        ];
      });
      const innerStyle = computed(() => {
        const width = `${unref(estimatedTotalWidth)}px`;
        const height = `${unref(estimatedTotalHeight)}px`;
        return {
          height,
          pointerEvents: unref(states).isScrolling ? "none" : void 0,
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
          ] = unref(columnsToRender);
          const [rowCacheStart, rowCacheEnd, rowVisibleStart, rowVisibleEnd] = unref(rowsToRender);
          emit(ITEM_RENDER_EVT, {
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
        } = unref(states);
        emit(SCROLL_EVT, {
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
        const _states = unref(states);
        if (_states.scrollTop === scrollTop && _states.scrollLeft === scrollLeft) {
          return;
        }
        let _scrollLeft = scrollLeft;
        if (isRTL(props.direction)) {
          switch (getRTLOffsetType()) {
            case RTL_OFFSET_NAG:
              _scrollLeft = -scrollLeft;
              break;
            case RTL_OFFSET_POS_DESC:
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
          xAxisScrollDir: getScrollDir(_states.scrollLeft, _scrollLeft),
          yAxisScrollDir: getScrollDir(_states.scrollTop, scrollTop)
        };
        nextTick(() => resetIsScrolling());
        onUpdated();
        emitEvents();
      };
      const onVerticalScroll = (distance, totalSteps) => {
        const height = unref(parsedHeight);
        const offset = (estimatedTotalHeight.value - height) / totalSteps * distance;
        scrollTo({
          scrollTop: Math.min(estimatedTotalHeight.value - height, offset)
        });
      };
      const onHorizontalScroll = (distance, totalSteps) => {
        const width = unref(parsedWidth);
        const offset = (estimatedTotalWidth.value - width) / totalSteps * distance;
        scrollTo({
          scrollLeft: Math.min(estimatedTotalWidth.value - width, offset)
        });
      };
      const { onWheel } = useGridWheel({
        atXStartEdge: computed(() => states.value.scrollLeft <= 0),
        atXEndEdge: computed(() => states.value.scrollLeft >= estimatedTotalWidth.value - unref(parsedWidth)),
        atYStartEdge: computed(() => states.value.scrollTop <= 0),
        atYEndEdge: computed(() => states.value.scrollTop >= estimatedTotalHeight.value - unref(parsedHeight))
      }, (x, y) => {
        var _a, _b, _c, _d;
        (_b = (_a = hScrollbar.value) == null ? void 0 : _a.onMouseUp) == null ? void 0 : _b.call(_a);
        (_d = (_c = vScrollbar.value) == null ? void 0 : _c.onMouseUp) == null ? void 0 : _d.call(_c);
        const width = unref(parsedWidth);
        const height = unref(parsedHeight);
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
        const _states = unref(states);
        if (scrollTop === _states.scrollTop && scrollLeft === _states.scrollLeft) {
          return;
        }
        states.value = {
          ..._states,
          xAxisScrollDir: getScrollDir(_states.scrollLeft, scrollLeft),
          yAxisScrollDir: getScrollDir(_states.scrollTop, scrollTop),
          scrollLeft,
          scrollTop,
          updateRequested: true
        };
        nextTick(() => resetIsScrolling());
        onUpdated();
        emitEvents();
      };
      const scrollToItem = (rowIndex = 0, columnIdx = 0, alignment = AUTO_ALIGNMENT) => {
        const _states = unref(states);
        columnIdx = Math.max(0, Math.min(columnIdx, props.totalColumn - 1));
        rowIndex = Math.max(0, Math.min(rowIndex, props.totalRow - 1));
        const scrollBarWidth = getScrollBarWidth(ns.namespace.value);
        const _cache = unref(cache);
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
        if (hasOwn(itemStyleCache, key)) {
          return itemStyleCache[key];
        } else {
          const [, left] = getColumnPosition(props, columnIndex, unref(cache));
          const _cache = unref(cache);
          const rtl = isRTL(direction);
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
        nextTick(() => {
          getItemStyleCache.value(-1, null, null);
        });
      };
      onMounted(() => {
        if (!isClient)
          return;
        const { initScrollLeft, initScrollTop } = props;
        const windowElement = unref(windowRef);
        if (windowElement) {
          if (isNumber(initScrollLeft)) {
            windowElement.scrollLeft = initScrollLeft;
          }
          if (isNumber(initScrollTop)) {
            windowElement.scrollTop = initScrollTop;
          }
        }
        emitEvents();
      });
      const onUpdated = () => {
        const { direction } = props;
        const { scrollLeft, scrollTop, updateRequested } = unref(states);
        const windowElement = unref(windowRef);
        if (updateRequested && windowElement) {
          if (direction === RTL) {
            switch (getRTLOffsetType()) {
              case RTL_OFFSET_NAG: {
                windowElement.scrollLeft = -scrollLeft;
                break;
              }
              case RTL_OFFSET_POS_ASC: {
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
        const width = unref(parsedWidth);
        const height = unref(parsedHeight);
        const estimatedWidth = unref(estimatedTotalWidth);
        const estimatedHeight = unref(estimatedTotalHeight);
        const { scrollLeft, scrollTop } = unref(states);
        const horizontalScrollbar = h(ScrollBar, {
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
        const verticalScrollbar = h(ScrollBar, {
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
        const [columnStart, columnEnd] = unref(columnsToRender);
        const [rowStart, rowEnd] = unref(rowsToRender);
        const { data, totalColumn, totalRow, useIsScrolling, itemKey } = props;
        const children = [];
        if (totalRow > 0 && totalColumn > 0) {
          for (let row = rowStart; row <= rowEnd; row++) {
            for (let column = columnStart; column <= columnEnd; column++) {
              children.push((_a = slots.default) == null ? void 0 : _a.call(slots, {
                columnIndex: column,
                data,
                key: itemKey({ columnIndex: column, data, rowIndex: row }),
                isScrolling: useIsScrolling ? unref(states).isScrolling : void 0,
                style: getItemStyle(row, column),
                rowIndex: row
              }));
            }
          }
        }
        return children;
      };
      const renderInner = () => {
        const Inner = resolveDynamicComponent(props.innerElement);
        const children = renderItems();
        return [
          h(Inner, {
            style: unref(innerStyle),
            ref: innerRef
          }, !isString(Inner) ? {
            default: () => children
          } : children)
        ];
      };
      const renderWindow = () => {
        const Container = resolveDynamicComponent(props.containerElement);
        const { horizontalScrollbar, verticalScrollbar } = renderScrollbars();
        const Inner = renderInner();
        return h("div", {
          key: 0,
          class: ns.e("wrapper"),
          role: props.role
        }, [
          h(Container, {
            class: props.className,
            style: unref(windowStyle),
            onScroll,
            onWheel,
            ref: windowRef
          }, !isString(Container) ? { default: () => Inner } : Inner),
          horizontalScrollbar,
          verticalScrollbar
        ]);
      };
      return renderWindow;
    }
  });
};

export { createGrid as default };
//# sourceMappingURL=build-grid.mjs.map
