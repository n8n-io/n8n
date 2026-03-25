'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var normalizeWheel = require('normalize-wheel-es');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var normalizeWheel__default = /*#__PURE__*/_interopDefaultLegacy(normalizeWheel);

const mousewheel = function(element, callback) {
  if (element && element.addEventListener) {
    const fn = function(event) {
      const normalized = normalizeWheel__default["default"](event);
      callback && Reflect.apply(callback, this, [event, normalized]);
    };
    element.addEventListener("wheel", fn, { passive: true });
  }
};
const Mousewheel = {
  beforeMount(el, binding) {
    mousewheel(el, binding.value);
  }
};

exports["default"] = Mousewheel;
//# sourceMappingURL=index.js.map
