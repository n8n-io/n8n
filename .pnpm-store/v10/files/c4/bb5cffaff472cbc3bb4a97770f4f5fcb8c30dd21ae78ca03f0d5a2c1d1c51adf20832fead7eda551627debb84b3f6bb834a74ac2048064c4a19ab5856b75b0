'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const useThrottleRender = (loading, throttle = 0) => {
  if (throttle === 0)
    return loading;
  const throttled = vue.ref(false);
  let timeoutHandle = 0;
  const dispatchThrottling = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    timeoutHandle = window.setTimeout(() => {
      throttled.value = loading.value;
    }, throttle);
  };
  vue.onMounted(dispatchThrottling);
  vue.watch(() => loading.value, (val) => {
    if (val) {
      dispatchThrottling();
    } else {
      throttled.value = val;
    }
  });
  return throttled;
};

exports.useThrottleRender = useThrottleRender;
//# sourceMappingURL=index.js.map
