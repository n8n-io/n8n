'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var useCache = require('../hooks/use-cache.js');
var useWheel = require('../hooks/use-wheel.js');
var scrollbar = require('../components/scrollbar.js');
var utils = require('../utils.js');
var props = require('../props.js');
var defaults = require('../defaults.js');
var index = require('../../../../hooks/use-namespace/index.js');
var types = require('../../../../utils/types.js');
var shared = require('@vue/shared');
var core = require('@vueuse/core');

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
  return vue.defineComponent({
    name: name != null ? name : "ElVirtualList",
    props: props.virtualizedListProps,
    emits: [defaults.ITEM_RENDER_EVT, defaults.SCROLL_EVT],
    setup(props, { emit, expose }) {
      validateProps(props);
      const instance = vue.getCurrentInstance();
      const ns = index.useNamespace("vl");
      const dynamicSizeCache = vue.ref(initCache(props, instance));
      const getItemStyleCache = useCache.useCache();
      const windowRef = vue.ref();
      const innerRef = vue.ref();
      const scrollbarRef = vue.ref();
      const states = vue.ref({
        isScrolling: false,
        scrollDir: "forward",
        scrollOffset: types.isNumber(props.initScrollOffset) ? props.initScrollOffset : 0,
        updateRequested: false,
        isScrollbarDragging: false,
        scrollbarAlwaysOn: props.scrollbarAlwaysOn
      });
      const itemsToRender = vue.computed(() => {
        const { total, cache } = props;
        const { isScrolling, scrollDir, scrollOffset } = vue.unref(states);
        if (total === 0) {
          return [0, 0, 0, 0];
        }
        const startIndex = getStartIndexForOffset(props, scrollOffset, vue.unref(dynamicSizeCache));
        const stopIndex = getStopIndexForStartIndex(props, startIndex, scrollOffset, vue.unref(dynamicSizeCache));
        const cacheBackward = !isScrolling || scrollDir === defaults.BACKWARD ? Math.max(1, cache) : 1;
        const cacheForward = !isScrolling || scrollDir === defaults.FORWARD ? Math.max(1, cache) : 1;
        return [
          Math.max(0, startIndex - cacheBackward),
          Math.max(0, Math.min(total - 1, stopIndex + cacheForward)),
          startIndex,
          stopIndex
        ];
      });
      const estimatedTotalSize = vue.computed(() => getEstimatedTotalSize(props, vue.unref(dynamicSizeCache)));
      const _isHorizontal = vue.computed(() => utils.isHorizontal(props.layout));
      const windowStyle = vue.computed(() => [
        {
          position: "relative",
          [`overflow-${_isHorizontal.value ? "x" : "y"}`]: "scroll",
          WebkitOverflowScrolling: "touch",
          willChange: "transform"
        },
        {
          direction: props.direction,
          height: types.isNumber(props.height) ? `${props.height}px` : props.height,
          width: types.isNumber(props.width) ? `${props.width}px` : props.width
        },
        props.style
      ]);
      const innerStyle = vue.computed(() => {
        const size = vue.unref(estimatedTotalSize);
        const horizontal = vue.unref(_isHorizontal);
        return {
          height: horizontal ? "100%" : `${size}px`,
          pointerEvents: vue.unref(states).isScrolling ? "none" : void 0,
          width: horizontal ? `${size}px` : "100%"
        };
      });
      const clientSize = vue.computed(() => _isHorizontal.value ? props.width : props.height);
      const { onWheel } = useWheel["default"]({
        atStartEdge: vue.computed(() => states.value.scrollOffset <= 0),
        atEndEdge: vue.computed(() => states.value.scrollOffset >= estimatedTotalSize.value),
        layout: vue.computed(() => props.layout)
      }, (offset) => {
        var _a, _b;
        ;
        (_b = (_a = scrollbarRef.value).onMouseUp) == null ? void 0 : _b.call(_a);
        scrollTo(Math.min(states.value.scrollOffset + offset, estimatedTotalSize.value - clientSize.value));
      });
      const emitEvents = () => {
        const { total } = props;
        if (total > 0) {
          const [cacheStart, cacheEnd, visibleStart, visibleEnd] = vue.unref(itemsToRender);
          emit(defaults.ITEM_RENDER_EVT, cacheStart, cacheEnd, visibleStart, visibleEnd);
        }
        const { scrollDir, scrollOffset, updateRequested } = vue.unref(states);
        emit(defaults.SCROLL_EVT, scrollDir, scrollOffset, updateRequested);
      };
      const scrollVertically = (e) => {
        const { clientHeight, scrollHeight, scrollTop } = e.currentTarget;
        const _states = vue.unref(states);
        if (_states.scrollOffset === scrollTop) {
          return;
        }
        const scrollOffset = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));
        states.value = {
          ..._states,
          isScrolling: true,
          scrollDir: utils.getScrollDir(_states.scrollOffset, scrollOffset),
          scrollOffset,
          updateRequested: false
        };
        vue.nextTick(resetIsScrolling);
      };
      const scrollHorizontally = (e) => {
        const { clientWidth, scrollLeft, scrollWidth } = e.currentTarget;
        const _states = vue.unref(states);
        if (_states.scrollOffset === scrollLeft) {
          return;
        }
        const { direction } = props;
        let scrollOffset = scrollLeft;
        if (direction === defaults.RTL) {
          switch (utils.getRTLOffsetType()) {
            case defaults.RTL_OFFSET_NAG: {
              scrollOffset = -scrollLeft;
              break;
            }
            case defaults.RTL_OFFSET_POS_DESC: {
              scrollOffset = scrollWidth - clientWidth - scrollLeft;
              break;
            }
          }
        }
        scrollOffset = Math.max(0, Math.min(scrollOffset, scrollWidth - clientWidth));
        states.value = {
          ..._states,
          isScrolling: true,
          scrollDir: utils.getScrollDir(_states.scrollOffset, scrollOffset),
          scrollOffset,
          updateRequested: false
        };
        vue.nextTick(resetIsScrolling);
      };
      const onScroll = (e) => {
        vue.unref(_isHorizontal) ? scrollHorizontally(e) : scrollVertically(e);
        emitEvents();
      };
      const onScrollbarScroll = (distanceToGo, totalSteps) => {
        const offset = (estimatedTotalSize.value - clientSize.value) / totalSteps * distanceToGo;
        scrollTo(Math.min(estimatedTotalSize.value - clientSize.value, offset));
      };
      const scrollTo = (offset) => {
        offset = Math.max(offset, 0);
        if (offset === vue.unref(states).scrollOffset) {
          return;
        }
        states.value = {
          ...vue.unref(states),
          scrollOffset: offset,
          scrollDir: utils.getScrollDir(vue.unref(states).scrollOffset, offset),
          updateRequested: true
        };
        vue.nextTick(resetIsScrolling);
      };
      const scrollToItem = (idx, alignment = defaults.AUTO_ALIGNMENT) => {
        const { scrollOffset } = vue.unref(states);
        idx = Math.max(0, Math.min(idx, props.total - 1));
        scrollTo(getOffset(props, idx, alignment, scrollOffset, vue.unref(dynamicSizeCache)));
      };
      const getItemStyle = (idx) => {
        const { direction, itemSize, layout } = props;
        const itemStyleCache = getItemStyleCache.value(clearCache && itemSize, clearCache && layout, clearCache && direction);
        let style;
        if (shared.hasOwn(itemStyleCache, String(idx))) {
          style = itemStyleCache[idx];
        } else {
          const offset = getItemOffset(props, idx, vue.unref(dynamicSizeCache));
          const size = getItemSize(props, idx, vue.unref(dynamicSizeCache));
          const horizontal = vue.unref(_isHorizontal);
          const isRtl = direction === defaults.RTL;
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
        vue.nextTick(() => {
          getItemStyleCache.value(-1, null, null);
        });
      };
      const resetScrollTop = () => {
        const window = windowRef.value;
        if (window) {
          window.scrollTop = 0;
        }
      };
      vue.onMounted(() => {
        if (!core.isClient)
          return;
        const { initScrollOffset } = props;
        const windowElement = vue.unref(windowRef);
        if (types.isNumber(initScrollOffset) && windowElement) {
          if (vue.unref(_isHorizontal)) {
            windowElement.scrollLeft = initScrollOffset;
          } else {
            windowElement.scrollTop = initScrollOffset;
          }
        }
        emitEvents();
      });
      vue.onUpdated(() => {
        const { direction, layout } = props;
        const { scrollOffset, updateRequested } = vue.unref(states);
        const windowElement = vue.unref(windowRef);
        if (updateRequested && windowElement) {
          if (layout === defaults.HORIZONTAL) {
            if (direction === defaults.RTL) {
              switch (utils.getRTLOffsetType()) {
                case defaults.RTL_OFFSET_NAG: {
                  windowElement.scrollLeft = -scrollOffset;
                  break;
                }
                case defaults.RTL_OFFSET_POS_ASC: {
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
      const Container = vue.resolveDynamicComponent(containerElement);
      const Inner = vue.resolveDynamicComponent(innerElement);
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
        vue.h(Inner, {
          style: innerStyle,
          ref: "innerRef"
        }, !shared.isString(Inner) ? {
          default: () => children
        } : children)
      ];
      const scrollbar$1 = vue.h(scrollbar["default"], {
        ref: "scrollbarRef",
        clientSize,
        layout,
        onScroll: onScrollbarScroll,
        ratio: clientSize * 100 / this.estimatedTotalSize,
        scrollFrom: states.scrollOffset / (this.estimatedTotalSize - clientSize),
        total
      });
      const listContainer = vue.h(Container, {
        class: [ns.e("window"), className],
        style: windowStyle,
        onScroll,
        onWheel,
        ref: "windowRef",
        key: 0
      }, !shared.isString(Container) ? { default: () => [InnerNode] } : [InnerNode]);
      return vue.h("div", {
        key: 0,
        class: [ns.e("wrapper"), states.scrollbarAlwaysOn ? "always-on" : ""]
      }, [listContainer, scrollbar$1]);
    }
  });
};

exports["default"] = createList;
//# sourceMappingURL=build-list.js.map
