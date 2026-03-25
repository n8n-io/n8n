'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../utils/index.js');
var constants = require('./constants.js');
var error = require('../../../utils/error.js');
var types = require('../../../utils/types.js');

const useCarouselItem = (props, componentName) => {
  const carouselContext = vue.inject(constants.carouselContextKey);
  const instance = vue.getCurrentInstance();
  if (!carouselContext) {
    error.debugWarn(componentName, "usage: <el-carousel></el-carousel-item></el-carousel>");
  }
  if (!instance) {
    error.debugWarn(componentName, "compositional hook can only be invoked inside setups");
  }
  const CARD_SCALE = 0.83;
  const carouselItemRef = vue.ref();
  const hover = vue.ref(false);
  const translate = vue.ref(0);
  const scale = vue.ref(1);
  const active = vue.ref(false);
  const ready = vue.ref(false);
  const inStage = vue.ref(false);
  const animating = vue.ref(false);
  const { isCardType, isVertical } = carouselContext;
  function processIndex(index, activeIndex, length) {
    const lastItemIndex = length - 1;
    const prevItemIndex = activeIndex - 1;
    const nextItemIndex = activeIndex + 1;
    const halfItemIndex = length / 2;
    if (activeIndex === 0 && index === lastItemIndex) {
      return -1;
    } else if (activeIndex === lastItemIndex && index === 0) {
      return length;
    } else if (index < prevItemIndex && activeIndex - index >= halfItemIndex) {
      return length + 1;
    } else if (index > nextItemIndex && index - activeIndex >= halfItemIndex) {
      return -2;
    }
    return index;
  }
  function calcCardTranslate(index, activeIndex) {
    var _a, _b;
    const parentWidth = vue.unref(isVertical) ? ((_a = carouselContext.root.value) == null ? void 0 : _a.offsetHeight) || 0 : ((_b = carouselContext.root.value) == null ? void 0 : _b.offsetWidth) || 0;
    if (inStage.value) {
      return parentWidth * ((2 - CARD_SCALE) * (index - activeIndex) + 1) / 4;
    } else if (index < activeIndex) {
      return -(1 + CARD_SCALE) * parentWidth / 4;
    } else {
      return (3 + CARD_SCALE) * parentWidth / 4;
    }
  }
  function calcTranslate(index, activeIndex, isVertical2) {
    const rootEl = carouselContext.root.value;
    if (!rootEl)
      return 0;
    const distance = (isVertical2 ? rootEl.offsetHeight : rootEl.offsetWidth) || 0;
    return distance * (index - activeIndex);
  }
  const translateItem = (index, activeIndex, oldIndex) => {
    var _a;
    const _isCardType = vue.unref(isCardType);
    const carouselItemLength = (_a = carouselContext.items.value.length) != null ? _a : Number.NaN;
    const isActive = index === activeIndex;
    if (!_isCardType && !types.isUndefined(oldIndex)) {
      animating.value = isActive || index === oldIndex;
    }
    if (!isActive && carouselItemLength > 2 && carouselContext.loop) {
      index = processIndex(index, activeIndex, carouselItemLength);
    }
    const _isVertical = vue.unref(isVertical);
    active.value = isActive;
    if (_isCardType) {
      inStage.value = Math.round(Math.abs(index - activeIndex)) <= 1;
      translate.value = calcCardTranslate(index, activeIndex);
      scale.value = vue.unref(active) ? 1 : CARD_SCALE;
    } else {
      translate.value = calcTranslate(index, activeIndex, _isVertical);
    }
    ready.value = true;
    if (isActive && carouselItemRef.value) {
      carouselContext.setContainerHeight(carouselItemRef.value.offsetHeight);
    }
  };
  function handleItemClick() {
    if (carouselContext && vue.unref(isCardType)) {
      const index = carouselContext.items.value.findIndex(({ uid }) => uid === instance.uid);
      carouselContext.setActiveItem(index);
    }
  }
  vue.onMounted(() => {
    carouselContext.addItem({
      props,
      states: vue.reactive({
        hover,
        translate,
        scale,
        active,
        ready,
        inStage,
        animating
      }),
      uid: instance.uid,
      translateItem
    });
  });
  vue.onUnmounted(() => {
    carouselContext.removeItem(instance.uid);
  });
  return {
    carouselItemRef,
    active,
    animating,
    hover,
    inStage,
    isVertical,
    translate,
    isCardType,
    scale,
    ready,
    handleItemClick
  };
};

exports.useCarouselItem = useCarouselItem;
//# sourceMappingURL=use-carousel-item.js.map
