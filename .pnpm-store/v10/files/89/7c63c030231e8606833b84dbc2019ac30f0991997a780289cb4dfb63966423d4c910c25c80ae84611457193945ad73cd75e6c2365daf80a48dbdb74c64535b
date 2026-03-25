'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
var core = require('@vueuse/core');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var index = require('../../../hooks/use-ordered-children/index.js');
var shared = require('@vue/shared');
var error = require('../../../utils/error.js');
var vnode = require('../../../utils/vue/vnode.js');

const THROTTLE_TIME = 300;
const useCarousel = (props, emit, componentName) => {
  const {
    children: items,
    addChild: addItem,
    removeChild: removeItem
  } = index.useOrderedChildren(vue.getCurrentInstance(), "ElCarouselItem");
  const slots = vue.useSlots();
  const activeIndex = vue.ref(-1);
  const timer = vue.ref(null);
  const hover = vue.ref(false);
  const root = vue.ref();
  const containerHeight = vue.ref(0);
  const isItemsTwoLength = vue.ref(true);
  const arrowDisplay = vue.computed(() => props.arrow !== "never" && !vue.unref(isVertical));
  const hasLabel = vue.computed(() => {
    return items.value.some((item) => item.props.label.toString().length > 0);
  });
  const isCardType = vue.computed(() => props.type === "card");
  const isVertical = vue.computed(() => props.direction === "vertical");
  const containerStyle = vue.computed(() => {
    if (props.height !== "auto") {
      return {
        height: props.height
      };
    }
    return {
      height: `${containerHeight.value}px`,
      overflow: "hidden"
    };
  });
  const throttledArrowClick = lodashUnified.throttle((index) => {
    setActiveItem(index);
  }, THROTTLE_TIME, { trailing: true });
  const throttledIndicatorHover = lodashUnified.throttle((index) => {
    handleIndicatorHover(index);
  }, THROTTLE_TIME);
  const isTwoLengthShow = (index) => {
    if (!isItemsTwoLength.value)
      return true;
    return activeIndex.value <= 1 ? index <= 1 : index > 1;
  };
  function pauseTimer() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  }
  function startTimer() {
    if (props.interval <= 0 || !props.autoplay || timer.value)
      return;
    timer.value = setInterval(() => playSlides(), props.interval);
  }
  const playSlides = () => {
    if (activeIndex.value < items.value.length - 1) {
      activeIndex.value = activeIndex.value + 1;
    } else if (props.loop) {
      activeIndex.value = 0;
    }
  };
  function setActiveItem(index) {
    if (shared.isString(index)) {
      const filteredItems = items.value.filter((item) => item.props.name === index);
      if (filteredItems.length > 0) {
        index = items.value.indexOf(filteredItems[0]);
      }
    }
    index = Number(index);
    if (Number.isNaN(index) || index !== Math.floor(index)) {
      error.debugWarn(componentName, "index must be integer.");
      return;
    }
    const itemCount = items.value.length;
    const oldIndex = activeIndex.value;
    if (index < 0) {
      activeIndex.value = props.loop ? itemCount - 1 : 0;
    } else if (index >= itemCount) {
      activeIndex.value = props.loop ? 0 : itemCount - 1;
    } else {
      activeIndex.value = index;
    }
    if (oldIndex === activeIndex.value) {
      resetItemPosition(oldIndex);
    }
    resetTimer();
  }
  function resetItemPosition(oldIndex) {
    items.value.forEach((item, index) => {
      item.translateItem(index, activeIndex.value, oldIndex);
    });
  }
  function itemInStage(item, index) {
    var _a, _b, _c, _d;
    const _items = vue.unref(items);
    const itemCount = _items.length;
    if (itemCount === 0 || !item.states.inStage)
      return false;
    const nextItemIndex = index + 1;
    const prevItemIndex = index - 1;
    const lastItemIndex = itemCount - 1;
    const isLastItemActive = _items[lastItemIndex].states.active;
    const isFirstItemActive = _items[0].states.active;
    const isNextItemActive = (_b = (_a = _items[nextItemIndex]) == null ? void 0 : _a.states) == null ? void 0 : _b.active;
    const isPrevItemActive = (_d = (_c = _items[prevItemIndex]) == null ? void 0 : _c.states) == null ? void 0 : _d.active;
    if (index === lastItemIndex && isFirstItemActive || isNextItemActive) {
      return "left";
    } else if (index === 0 && isLastItemActive || isPrevItemActive) {
      return "right";
    }
    return false;
  }
  function handleMouseEnter() {
    hover.value = true;
    if (props.pauseOnHover) {
      pauseTimer();
    }
  }
  function handleMouseLeave() {
    hover.value = false;
    startTimer();
  }
  function handleButtonEnter(arrow) {
    if (vue.unref(isVertical))
      return;
    items.value.forEach((item, index) => {
      if (arrow === itemInStage(item, index)) {
        item.states.hover = true;
      }
    });
  }
  function handleButtonLeave() {
    if (vue.unref(isVertical))
      return;
    items.value.forEach((item) => {
      item.states.hover = false;
    });
  }
  function handleIndicatorClick(index) {
    activeIndex.value = index;
  }
  function handleIndicatorHover(index) {
    if (props.trigger === "hover" && index !== activeIndex.value) {
      activeIndex.value = index;
    }
  }
  function prev() {
    setActiveItem(activeIndex.value - 1);
  }
  function next() {
    setActiveItem(activeIndex.value + 1);
  }
  function resetTimer() {
    pauseTimer();
    if (!props.pauseOnHover)
      startTimer();
  }
  function setContainerHeight(height) {
    if (props.height !== "auto")
      return;
    containerHeight.value = height;
  }
  function PlaceholderItem() {
    var _a;
    const defaultSlots = (_a = slots.default) == null ? void 0 : _a.call(slots);
    if (!defaultSlots)
      return null;
    const flatSlots = vnode.flattedChildren(defaultSlots);
    const carouselItemsName = "ElCarouselItem";
    const normalizeSlots = flatSlots.filter((slot) => {
      return vue.isVNode(slot) && slot.type.name === carouselItemsName;
    });
    if ((normalizeSlots == null ? void 0 : normalizeSlots.length) === 2 && props.loop && !isCardType.value) {
      isItemsTwoLength.value = true;
      return normalizeSlots;
    }
    isItemsTwoLength.value = false;
    return null;
  }
  vue.watch(() => activeIndex.value, (current, prev2) => {
    resetItemPosition(prev2);
    if (isItemsTwoLength.value) {
      current = current % 2;
      prev2 = prev2 % 2;
    }
    if (prev2 > -1) {
      emit("change", current, prev2);
    }
  });
  vue.watch(() => props.autoplay, (autoplay) => {
    autoplay ? startTimer() : pauseTimer();
  });
  vue.watch(() => props.loop, () => {
    setActiveItem(activeIndex.value);
  });
  vue.watch(() => props.interval, () => {
    resetTimer();
  });
  const resizeObserver = vue.shallowRef();
  vue.onMounted(() => {
    vue.watch(() => items.value, () => {
      if (items.value.length > 0)
        setActiveItem(props.initialIndex);
    }, {
      immediate: true
    });
    resizeObserver.value = core.useResizeObserver(root.value, () => {
      resetItemPosition();
    });
    startTimer();
  });
  vue.onBeforeUnmount(() => {
    pauseTimer();
    if (root.value && resizeObserver.value)
      resizeObserver.value.stop();
  });
  vue.provide(constants.carouselContextKey, {
    root,
    isCardType,
    isVertical,
    items,
    loop: props.loop,
    addItem,
    removeItem,
    setActiveItem,
    setContainerHeight
  });
  return {
    root,
    activeIndex,
    arrowDisplay,
    hasLabel,
    hover,
    isCardType,
    items,
    isVertical,
    containerStyle,
    isItemsTwoLength,
    handleButtonEnter,
    handleButtonLeave,
    handleIndicatorClick,
    handleMouseEnter,
    handleMouseLeave,
    setActiveItem,
    prev,
    next,
    PlaceholderItem,
    isTwoLengthShow,
    throttledArrowClick,
    throttledIndicatorHover
  };
};

exports.useCarousel = useCarousel;
//# sourceMappingURL=use-carousel.js.map
