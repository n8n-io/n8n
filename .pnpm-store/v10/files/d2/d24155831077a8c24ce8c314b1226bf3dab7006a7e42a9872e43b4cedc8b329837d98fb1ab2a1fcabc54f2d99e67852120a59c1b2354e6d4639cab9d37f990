import { watch } from 'vue';
import { useEventListener } from '@vueuse/core';

const usePreventGlobal = (indicator, evt, cb) => {
  const prevent = (e) => {
    if (cb(e))
      e.stopImmediatePropagation();
  };
  let stop = void 0;
  watch(() => indicator.value, (val) => {
    if (val) {
      stop = useEventListener(document, evt, prevent, true);
    } else {
      stop == null ? void 0 : stop();
    }
  }, { immediate: true });
};

export { usePreventGlobal };
//# sourceMappingURL=index.mjs.map
