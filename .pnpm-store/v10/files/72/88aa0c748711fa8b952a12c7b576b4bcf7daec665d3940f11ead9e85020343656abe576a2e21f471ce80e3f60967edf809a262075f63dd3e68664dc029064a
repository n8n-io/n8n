'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');

const useAutoResize = (props) => {
  const sizer = vue.ref();
  const width$ = vue.ref(0);
  const height$ = vue.ref(0);
  let resizerStopper;
  vue.onMounted(() => {
    resizerStopper = core.useResizeObserver(sizer, ([entry]) => {
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
  vue.onBeforeUnmount(() => {
    resizerStopper == null ? void 0 : resizerStopper();
  });
  vue.watch([width$, height$], ([width, height]) => {
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

exports.useAutoResize = useAutoResize;
//# sourceMappingURL=use-auto-resize.js.map
