'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@vueuse/core');

function useTimeout() {
  let timeoutHandle;
  const registerTimeout = (fn, delay) => {
    cancelTimeout();
    timeoutHandle = window.setTimeout(fn, delay);
  };
  const cancelTimeout = () => window.clearTimeout(timeoutHandle);
  core.tryOnScopeDispose(() => cancelTimeout());
  return {
    registerTimeout,
    cancelTimeout
  };
}

exports.useTimeout = useTimeout;
//# sourceMappingURL=index.js.map
