import normalizeWheel from 'normalize-wheel-es';

const mousewheel = function(element, callback) {
  if (element && element.addEventListener) {
    const fn = function(event) {
      const normalized = normalizeWheel(event);
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

export { Mousewheel as default };
//# sourceMappingURL=index.mjs.map
