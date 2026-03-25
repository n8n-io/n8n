import { inject, getCurrentInstance, ref, unref, onMounted, reactive, onUnmounted } from 'vue';
import '../../../utils/index.mjs';
import { carouselContextKey } from './constants.mjs';
import { debugWarn } from '../../../utils/error.mjs';
import { isUndefined } from '../../../utils/types.mjs';

const useCarouselItem = (props, componentName) => {
  const carouselContext = inject(carouselContextKey);
  const instance = getCurrentInstance();
  if (!carouselContext) {
    debugWarn(componentName, "usage: <el-carousel></el-carousel-item></el-carousel>");
  }
  if (!instance) {
    debugWarn(componentName, "compositional hook can only be invoked inside setups");
  }
  const CARD_SCALE = 0.83;
  const carouselItemRef = ref();
  const hover = ref(false);
  const translate = ref(0);
  const scale = ref(1);
  const active = ref(false);
  const ready = ref(false);
  const inStage = ref(false);
  const animating = ref(false);
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
    const parentWidth = unref(isVertical) ? ((_a = carouselContext.root.value) == null ? void 0 : _a.offsetHeight) || 0 : ((_b = carouselContext.root.value) == null ? void 0 : _b.offsetWidth) || 0;
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
    const _isCardType = unref(isCardType);
    const carouselItemLength = (_a = carouselContext.items.value.length) != null ? _a : Number.NaN;
    const isActive = index === activeIndex;
    if (!_isCardType && !isUndefined(oldIndex)) {
      animating.value = isActive || index === oldIndex;
    }
    if (!isActive && carouselItemLength > 2 && carouselContext.loop) {
      index = processIndex(index, activeIndex, carouselItemLength);
    }
    const _isVertical = unref(isVertical);
    active.value = isActive;
    if (_isCardType) {
      inStage.value = Math.round(Math.abs(index - activeIndex)) <= 1;
      translate.value = calcCardTranslate(index, activeIndex);
      scale.value = unref(active) ? 1 : CARD_SCALE;
    } else {
      translate.value = calcTranslate(index, activeIndex, _isVertical);
    }
    ready.value = true;
    if (isActive && carouselItemRef.value) {
      carouselContext.setContainerHeight(carouselItemRef.value.offsetHeight);
    }
  };
  function handleItemClick() {
    if (carouselContext && unref(isCardType)) {
      const index = carouselContext.items.value.findIndex(({ uid }) => uid === instance.uid);
      carouselContext.setActiveItem(index);
    }
  }
  onMounted(() => {
    carouselContext.addItem({
      props,
      states: reactive({
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
  onUnmounted(() => {
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

export { useCarouselItem };
//# sourceMappingURL=use-carousel-item.mjs.map
