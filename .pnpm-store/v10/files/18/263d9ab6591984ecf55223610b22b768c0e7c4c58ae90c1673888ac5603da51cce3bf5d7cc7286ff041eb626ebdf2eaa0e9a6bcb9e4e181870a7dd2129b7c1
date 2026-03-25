'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');

const usePreventGlobal = (indicator, evt, cb) => {
  const prevent = (e) => {
    if (cb(e))
      e.stopImmediatePropagation();
  };
  let stop = void 0;
  vue.watch(() => indicator.value, (val) => {
    if (val) {
      stop = core.useEventListener(document, evt, prevent, true);
    } else {
      stop == null ? void 0 : stop();
    }
  }, { immediate: true });
};

exports.usePreventGlobal = usePreventGlobal;
//# sourceMappingURL=index.js.map
