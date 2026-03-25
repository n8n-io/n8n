import { onMounted, onBeforeUnmount } from 'vue';
import '../../utils/index.mjs';
import '../../constants/index.mjs';
import { EVENT_CODE } from '../../constants/aria.mjs';
import { isClient } from '@vueuse/core';

let registeredEscapeHandlers = [];
const cachedHandler = (e) => {
  const event = e;
  if (event.key === EVENT_CODE.esc) {
    registeredEscapeHandlers.forEach((registeredHandler) => registeredHandler(event));
  }
};
const useEscapeKeydown = (handler) => {
  onMounted(() => {
    if (registeredEscapeHandlers.length === 0) {
      document.addEventListener("keydown", cachedHandler);
    }
    if (isClient)
      registeredEscapeHandlers.push(handler);
  });
  onBeforeUnmount(() => {
    registeredEscapeHandlers = registeredEscapeHandlers.filter((registeredHandler) => registeredHandler !== handler);
    if (registeredEscapeHandlers.length === 0) {
      if (isClient)
        document.removeEventListener("keydown", cachedHandler);
    }
  });
};

export { useEscapeKeydown };
//# sourceMappingURL=index.mjs.map
