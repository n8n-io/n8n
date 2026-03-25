'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const FORWARD_REF_INJECTION_KEY = Symbol("elForwardRef");
const useForwardRef = (forwardRef) => {
  const setForwardRef = (el) => {
    forwardRef.value = el;
  };
  vue.provide(FORWARD_REF_INJECTION_KEY, {
    setForwardRef
  });
};
const useForwardRefDirective = (setForwardRef) => {
  return {
    mounted(el) {
      setForwardRef(el);
    },
    updated(el) {
      setForwardRef(el);
    },
    unmounted() {
      setForwardRef(null);
    }
  };
};

exports.FORWARD_REF_INJECTION_KEY = FORWARD_REF_INJECTION_KEY;
exports.useForwardRef = useForwardRef;
exports.useForwardRefDirective = useForwardRefDirective;
//# sourceMappingURL=index.js.map
