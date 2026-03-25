import { ref, onMounted, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';

const useLifecycle = (props, initData, resetSize) => {
  const sliderWrapper = ref();
  onMounted(async () => {
    if (props.range) {
      if (Array.isArray(props.modelValue)) {
        initData.firstValue = Math.max(props.min, props.modelValue[0]);
        initData.secondValue = Math.min(props.max, props.modelValue[1]);
      } else {
        initData.firstValue = props.min;
        initData.secondValue = props.max;
      }
      initData.oldValue = [initData.firstValue, initData.secondValue];
    } else {
      if (typeof props.modelValue !== "number" || Number.isNaN(props.modelValue)) {
        initData.firstValue = props.min;
      } else {
        initData.firstValue = Math.min(props.max, Math.max(props.min, props.modelValue));
      }
      initData.oldValue = initData.firstValue;
    }
    useEventListener(window, "resize", resetSize);
    await nextTick();
    resetSize();
  });
  return {
    sliderWrapper
  };
};

export { useLifecycle };
//# sourceMappingURL=use-lifecycle.mjs.map
