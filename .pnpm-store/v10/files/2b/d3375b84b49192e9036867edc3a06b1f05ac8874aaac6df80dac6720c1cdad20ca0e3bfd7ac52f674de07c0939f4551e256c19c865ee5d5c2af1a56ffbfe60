import { defineComponent, getCurrentInstance, ref, computed, unref, nextTick, onMounted, onUpdated, resolveDynamicComponent, h } from 'vue';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import { useCache } from '../hooks/use-cache.mjs';
import useWheel from '../hooks/use-wheel.mjs';
import ScrollBar from '../components/scrollbar.mjs';
import { isHorizontal, getScrollDir, getRTLOffsetType } from '../utils.mjs';
import { virtualizedListProps } from '../props.mjs';
import { ITEM_RENDER_EVT, SCROLL_EVT, BACKWARD, FORWARD, RTL, RTL_OFFSET_POS_DESC, RTL_OFFSET_NAG, AUTO_ALIGNMENT, HORIZONTAL, RTL_OFFSET_POS_ASC } from '../defaults.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { isNumber } from '../../../../utils/types.mjs';
import { hasOwn, isString } from '@vue/shared';
import { isClient } from '@vueuse/core';

const createList = ({
  name,
  getOffset,
  getItemSize,
  getItemOffset,
  getEstimatedTotalSize,
  getStartIndexForOffset,
  getStopIndexForStartIndex,
  initCache,
  clearCache,
  validateProps
}) => {
  return defineComponent({
    name: name != null ? name : "ElVirtualList",
    props: virtualizedListProps,
    emits: [ITEM_RENDER_EVT, SCROLL_EVT],
    setup(props, { emit, expose }) {
      validateProps(props);
      const instance = getCurrentInstance();
      const ns = useNamespace("vl");
      const dynamicSizeCache = ref(initCache(props, instance));
      const getItemStyleCache = useCache();
      const windowRef = ref();
      const innerRef = ref();
      const scrollbarRef = ref();
      const states = ref({
        isScrolling: false,
        scrollDir: "forward",
        scrollOffset: isNumber(props.initScrollOffset) ? props.initScrollOffset : 0,
        updateRequested: false,
        isScrollbarDragging: false,
        scrollbarAlwaysOn: props.scrollbarAlwaysOn
      });
      const itemsToRender = computed(() => {
        const { total, cache } = props;
        const { isScrolling, scrollDir, scrollOffset } = unref(states);
        if (total === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getStartIndexForOffset(props, scrollOffset, unref(dynamicSizeCache));
        const stopIndex = getStopIndexForStartIndex(props, startIndex, scrollOffset, unref(dynamicSizeCache));
        const cacheBackward = !isScrolling || scrollDir === BACKWARD ? Math.max(1, cache) : 1;
        const cacheForward = !isScrolling || scrollDir === FORWARD ? Math.max(1, cache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(total - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const estimatedTotalSize = computed(() => getEstimatedTotalSize(props, unref(dynamicSizeCache)));
      const _isHorizontal = computed(() => isHorizontal(props.layout));
      const windowStyle = computed(() => [
        {
          position: "relative",
          [`overflow-${_isHorizontal.value ? "x" : "y"}`]: "scroll",
          WebkitOverflowScrolling: "touch",
          willChange: "transform"
        },
        {
          direction: props.direction,
          height: isNumber(props.height) ? `${props.height}px` : props.height,
          width: isNumber(props.width) ? `${props.width}px` : props.width
        },
        props.style
      ]);
      const innerStyle = computed(() => {
        const size = unref(estimatedTotalSize);
        const horizontal = unref(_isHorizontal);
        return {
          height: horizontal ? "100%" : `${size}px`,
          pointerEvents: unref(states).isScrolling ? "none" : void 0,
          width: horizontal ? `${size}px` : "100%"
        };
      });
      const clientSize = computed(() => _isHorizontal.value ? props.width : props.height);
      const { onWheel } = useWheel({
        atStartEdge: computed(() => states.value.scrollOffset <= 0),
        atEndEdge: computed(() => states.value.scrollOffset >= estimatedTotalSize.value),
        layout: computed(() => props.layout)
      }, (offset) => {
        var _a, _b;
        ;
        (_b = (_a = scrollbarRef.value).onMouseUp) == null ? void 0 : _b.call(_a);
        scrollTo(Math.min(states.value.scrollOffset + offset, estimatedTotalSize.value - clientSize.value));
      });
      const emitEvents = () => {
        const { total } = props;
        if (total > 0) {
          const [cacheStart, cacheEnd, visibleStart, visibleEnd] = unref(itemsToRender);
          emit(ITEM_RENDER_EVT, cacheStart, cacheEnd, visibleStart, visibleEnd);
        }
        const { scrollDir, scrollOffset, updateRequested } = unref(states);
        emit(SCROLL_EVT, scrollDir, scrollOffset, updateRequested);
      };
      const scrollVertically = (e) => {
        const { clientHeight, scrollHeight, scrollTop } = e.currentTarget;
        const _states = unref(states);
        if (_states.scrollOffset === scrollTop) {
          return;
        }
        const scrollOffset = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));
        states.value = {
          ..._states,
          isScrolling: true,
          scrollDir: getScrollDir(_states.scrollOffset, scrollOffset),
          scrollOffset,
          updateRequested: false
        };
        nextTick(resetIsScrolling);
      };
      const scrollHorizontally = (e) => {
        const { clientWidth, scrollLeft, scrollWidth } = e.currentTarget;
        const _states = unref(states);
        if (_states.scrollOffset === scrollLeft) {
          return;
        }
        const { direction } = props;
        let scrollOffset = scrollLeft;
        if (direction === RTL) {
          switch (getRTLOffsetType()) {
            case RTL_OFFSET_NAG: {
              scrollOffset = -scrollLeft;
              break;
            }
            case RTL_OFFSET_POS_DESC: {
              scrollOffset = scrollWidth - clientWidth - scrollLeft;
              break;
            }
          }
        }
        scrollOffset = Math.max(0, Math.min(scrollOffset, scrollWidth - clientWidth));
        states.value = {
          ..._states,
          isScrolling: true,
          scrollDir: getScrollDir(_states.scrollOffset, scrollOffset),
          scrollOffset,
          updateRequested: false
        };
        nextTick(resetIsScrolling);
      };
      const onScroll = (e) => {
        unref(_isHorizontal) ? scrollHorizontally(e) : scrollVertically(e);
        emitEvents();
      };
      const onScrollbarScroll = (distanceToGo, totalSteps) => {
        const offset = (estimatedTotalSize.value - clientSize.value) / totalSteps * distanceToGo;
        scrollTo(Math.min(estimatedTotalSize.value - clientSize.value, offset));
      };
      const scrollTo = (offset) => {
        offset = Math.max(offset, 0);
        if (offset === unref(states).scrollOffset) {
          return;
        }
        states.value = {
          ...unref(states),
          scrollOffset: offset,
          scrollDir: getScrollDir(unref(states).scrollOffset, offset),
          updateRequested: true
        };
        nextTick(resetIsScrolling);
      };
      const scrollToItem = (idx, alignment = AUTO_ALIGNMENT) => {
        const { scrollOffset } = unref(states);
        idx = Math.max(0, Math.min(idx, props.total - 1));
        scrollTo(getOffset(props, idx, alignment, scrollOffset, unref(dynamicSizeCache)));
      };
      const getItemStyle = (idx) => {
        const { direction, itemSize, layout } = props;
        const itemStyleCache = getItemStyleCache.value(clearCache && itemSize, clearCache && layout, clearCache && direction);
        let style;
        if (hasOwn(itemStyleCache, String(idx))) {
          style = itemStyleCache[idx];
        } else {
          const offset = getItemOffset(props, idx, unref(dynamicSizeCache));
          const size = getItemSize(props, idx, unref(dynamicSizeCache));
          const horizontal = unref(_isHorizontal);
          const isRtl = direction === RTL;
          const offsetHorizontal = horizontal ? offset : 0;
          itemStyleCache[idx] = style = {
            position: "absolute",
            left: isRtl ? void 0 : `${offsetHorizontal}px`,
            right: isRtl ? `${offsetHorizontal}px` : void 0,
            top: !horizontal ? `${offset}px` : 0,
            height: !horizontal ? `${size}px` : "100%",
            width: horizontal ? `${size}px` : "100%"
          };
        }
        return style;
      };
      const resetIsScrolling = () => {
        states.value.isScrolling = false;
        nextTick(() => {
          getItemStyleCache.value(-1, null, null);
        });
      };
      const resetScrollTop = () => {
        const window = windowRef.value;
        if (window) {
          window.scrollTop = 0;
        }
      };
      onMounted(() => {
        if (!isClient)
          return;
        const { initScrollOffset } = props;
        const windowElement = unref(windowRef);
        if (isNumber(initScrollOffset) && windowElement) {
          if (unref(_isHorizontal)) {
            windowElement.scrollLeft = initScrollOffset;
          } else {
            windowElement.scrollTop = initScrollOffset;
          }
        }
        emitEvents();
      });
      onUpdated(() => {
        const { direction, layout } = props;
        const { scrollOffset, updateRequested } = unref(states);
        const windowElement = unref(windowRef);
        if (updateRequested && windowElement) {
          if (layout === HORIZONTAL) {
            if (direction === RTL) {
              switch (getRTLOffsetType()) {
                case RTL_OFFSET_NAG: {
                  windowElement.scrollLeft = -scrollOffset;
                  break;
                }
                case RTL_OFFSET_POS_ASC: {
                  windowElement.scrollLeft = scrollOffset;
                  break;
                }
                default: {
                  const { clientWidth, scrollWidth } = windowElement;
                  windowElement.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                  break;
                }
              }
            } else {
              windowElement.scrollLeft = scrollOffset;
            }
          } else {
            windowElement.scrollTop = scrollOffset;
          }
        }
      });
      const api = {
        ns,
        clientSize,
        estimatedTotalSize,
        windowStyle,
        windowRef,
        innerRef,
        innerStyle,
        itemsToRender,
        scrollbarRef,
        states,
        getItemStyle,
        onScroll,
        onScrollbarScroll,
        onWheel,
        scrollTo,
        scrollToItem,
        resetScrollTop
      };
      expose({
        windowRef,
        innerRef,
        getItemStyleCache,
        scrollTo,
        scrollToItem,
        resetScrollTop,
        states
      });
      return api;
    },
    render(ctx) {
      var _a;
      const {
        $slots,
        className,
        clientSize,
        containerElement,
        data,
        getItemStyle,
        innerElement,
        itemsToRender,
        innerStyle,
        layout,
        total,
        onScroll,
        onScrollbarScroll,
        onWheel,
        states,
        useIsScrolling,
        windowStyle,
        ns
      } = ctx;
      const [start, end] = itemsToRender;
      const Container = resolveDynamicComponent(containerElement);
      const Inner = resolveDynamicComponent(innerElement);
      const children = [];
      if (total > 0) {
        for (let i = start; i <= end; i++) {
          children.push((_a = $slots.default) == null ? void 0 : _a.call($slots, {
            data,
            key: i,
            index: i,
            isScrolling: useIsScrolling ? states.isScrolling : void 0,
            style: getItemStyle(i)
          }));
        }
      }
      const InnerNode = [
        h(Inner, {
          style: innerStyle,
          ref: "innerRef"
        }, !isString(Inner) ? {
          default: () => children
        } : children)
      ];
      const scrollbar = h(ScrollBar, {
        ref: "scrollbarRef",
        clientSize,
        layout,
        onScroll: onScrollbarScroll,
        ratio: clientSize * 100 / this.estimatedTotalSize,
        scrollFrom: states.scrollOffset / (this.estimatedTotalSize - clientSize),
        total
      });
      const listContainer = h(Container, {
        class: [ns.e("window"), className],
        style: windowStyle,
        onScroll,
        onWheel,
        ref: "windowRef",
        key: 0
      }, !isString(Container) ? { default: () => [InnerNode] } : [InnerNode]);
      return h("div", {
        key: 0,
        class: [ns.e("wrapper"), states.scrollbarAlwaysOn ? "always-on" : ""]
      }, [listContainer, scrollbar]);
    }
  });
};

export { createList as default };
//# sourceMappingURL=build-list.mjs.map
