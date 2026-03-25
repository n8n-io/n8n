import { getCurrentInstance, useSlots, ref, computed, unref, isVNode, watch, shallowRef, onMounted, onBeforeUnmount, provide } from 'vue';
import { throttle } from 'lodash-unified';
import { useResizeObserver } from '@vueuse/core';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { carouselContextKey } from './constants.mjs';
import { useOrderedChildren } from '../../../hooks/use-ordered-children/index.mjs';
import { isString } from '@vue/shared';
import { debugWarn } from '../../../utils/error.mjs';
import { flattedChildren } from '../../../utils/vue/vnode.mjs';

const THROTTLE_TIME = 300;
const useCarousel = (props, emit, componentName) => {
  const {
    children: items,
    addChild: addItem,
    removeChild: removeItem
  } = useOrderedChildren(getCurrentInstance(), "ElCarouselItem");
  const slots = useSlots();
  const activeIndex = ref(-1);
  const timer = ref(null);
  const hover = ref(false);
  const root = ref();
  const containerHeight = ref(0);
  const isItemsTwoLength = ref(true);
  const arrowDisplay = computed(() => props.arrow !== "never" && !unref(isVertical));
  const hasLabel = computed(() => {
    return items.value.some((item) => item.props.label.toString().length > 0);
  });
  const isCardType = computed(() => props.type === "card");
  const isVertical = computed(() => props.direction === "vertical");
  const containerStyle = computed(() => {
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
  const throttledArrowClick = throttle((index) => {
    setActiveItem(index);
  }, THROTTLE_TIME, { trailing: true });
  const throttledIndicatorHover = throttle((index) => {
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
    if (isString(index)) {
      const filteredItems = items.value.filter((item) => item.props.name === index);
      if (filteredItems.length > 0) {
        index = items.value.indexOf(filteredItems[0]);
      }
    }
    index = Number(index);
    if (Number.isNaN(index) || index !== Math.floor(index)) {
      debugWarn(componentName, "index must be integer.");
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
    const _items = unref(items);
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
    if (unref(isVertical))
      return;
    items.value.forEach((item, index) => {
      if (arrow === itemInStage(item, index)) {
        item.states.hover = true;
      }
    });
  }
  function handleButtonLeave() {
    if (unref(isVertical))
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
    const flatSlots = flattedChildren(defaultSlots);
    const carouselItemsName = "ElCarouselItem";
    const normalizeSlots = flatSlots.filter((slot) => {
      return isVNode(slot) && slot.type.name === carouselItemsName;
    });
    if ((normalizeSlots == null ? void 0 : normalizeSlots.length) === 2 && props.loop && !isCardType.value) {
      isItemsTwoLength.value = true;
      return normalizeSlots;
    }
    isItemsTwoLength.value = false;
    return null;
  }
  watch(() => activeIndex.value, (current, prev2) => {
    resetItemPosition(prev2);
    if (isItemsTwoLength.value) {
      current = current % 2;
      prev2 = prev2 % 2;
    }
    if (prev2 > -1) {
      emit("change", current, prev2);
    }
  });
  watch(() => props.autoplay, (autoplay) => {
    autoplay ? startTimer() : pauseTimer();
  });
  watch(() => props.loop, () => {
    setActiveItem(activeIndex.value);
  });
  watch(() => props.interval, () => {
    resetTimer();
  });
  const resizeObserver = shallowRef();
  onMounted(() => {
    watch(() => items.value, () => {
      if (items.value.length > 0)
        setActiveItem(props.initialIndex);
    }, {
      immediate: true
    });
    resizeObserver.value = useResizeObserver(root.value, () => {
      resetItemPosition();
    });
    startTimer();
  });
  onBeforeUnmount(() => {
    pauseTimer();
    if (root.value && resizeObserver.value)
      resizeObserver.value.stop();
  });
  provide(carouselContextKey, {
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

export { useCarousel };
//# sourceMappingURL=use-carousel.mjs.map
