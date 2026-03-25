import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const useAutoResize = (props) => {
  const sizer = ref();
  const width$ = ref(0);
  const height$ = ref(0);
  let resizerStopper;
  onMounted(() => {
    resizerStopper = useResizeObserver(sizer, ([entry]) => {
      const { width, height } = entry.contentRect;
      const { paddingLeft, paddingRight, paddingTop, paddingBottom } = getComputedStyle(entry.target);
      const left = Number.parseInt(paddingLeft) || 0;
      const right = Number.parseInt(paddingRight) || 0;
      const top = Number.parseInt(paddingTop) || 0;
      const bottom = Number.parseInt(paddingBottom) || 0;
      width$.value = width - left - right;
      height$.value = height - top - bottom;
    }).stop;
  });
  onBeforeUnmount(() => {
    resizerStopper == null ? void 0 : resizerStopper();
  });
  watch([width$, height$], ([width, height]) => {
    var _a;
    (_a = props.onResize) == null ? void 0 : _a.call(props, {
      width,
      height
    });
  });
  return {
    sizer,
    width: width$,
    height: height$
  };
};

export { useAutoResize };
//# sourceMappingURL=use-auto-resize.mjs.map
