'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
require('../../constants/index.js');
var aria = require('../../constants/aria.js');
var core = require('@vueuse/core');

let registeredEscapeHandlers = [];
const cachedHandler = (e) => {
  const event = e;
  if (event.key === aria.EVENT_CODE.esc) {
    registeredEscapeHandlers.forEach((registeredHandler) => registeredHandler(event));
  }
};
const useEscapeKeydown = (handler) => {
  vue.onMounted(() => {
    if (registeredEscapeHandlers.length === 0) {
      document.addEventListener("keydown", cachedHandler);
    }
    if (core.isClient)
      registeredEscapeHandlers.push(handler);
  });
  vue.onBeforeUnmount(() => {
    registeredEscapeHandlers = registeredEscapeHandlers.filter((registeredHandler) => registeredHandler !== handler);
    if (registeredEscapeHandlers.length === 0) {
      if (core.isClient)
        document.removeEventListener("keydown", cachedHandler);
    }
  });
};

exports.useEscapeKeydown = useEscapeKeydown;
//# sourceMappingURL=index.js.map
