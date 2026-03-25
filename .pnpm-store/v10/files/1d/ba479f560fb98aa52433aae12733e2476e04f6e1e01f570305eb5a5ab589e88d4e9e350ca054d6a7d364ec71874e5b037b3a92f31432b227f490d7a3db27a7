import { ref, onMounted, watch } from 'vue';

const useThrottleRender = (loading, throttle = 0) => {
  if (throttle === 0)
    return loading;
  const throttled = ref(false);
  let timeoutHandle = 0;
  const dispatchThrottling = () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    timeoutHandle = window.setTimeout(() => {
      throttled.value = loading.value;
    }, throttle);
  };
  onMounted(dispatchThrottling);
  watch(() => loading.value, (val) => {
    if (val) {
      dispatchThrottling();
    } else {
      throttled.value = val;
    }
  });
  return throttled;
};

export { useThrottleRender };
//# sourceMappingURL=index.mjs.map
