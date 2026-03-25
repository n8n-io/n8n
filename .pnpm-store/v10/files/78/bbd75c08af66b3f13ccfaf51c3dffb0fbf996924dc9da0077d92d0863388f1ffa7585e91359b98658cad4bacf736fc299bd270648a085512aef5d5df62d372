"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const virtualCore = require("@tanstack/virtual-core");
const vue = require("vue");
function useVirtualizerBase(options) {
  const virtualizer = new virtualCore.Virtualizer(vue.unref(options));
  const state = vue.shallowRef(virtualizer);
  const cleanup = virtualizer._didMount();
  vue.watch(
    () => vue.unref(options).getScrollElement(),
    (el) => {
      if (el) {
        virtualizer._willUpdate();
      }
    },
    {
      immediate: true
    }
  );
  vue.watch(
    () => vue.unref(options),
    (options2) => {
      virtualizer.setOptions({
        ...options2,
        onChange: (instance, sync) => {
          var _a;
          vue.triggerRef(state);
          (_a = options2.onChange) == null ? void 0 : _a.call(options2, instance, sync);
        }
      });
      virtualizer._willUpdate();
      vue.triggerRef(state);
    },
    {
      immediate: true
    }
  );
  vue.onScopeDispose(cleanup);
  return state;
}
function useVirtualizer(options) {
  return useVirtualizerBase(
    vue.computed(() => ({
      observeElementRect: virtualCore.observeElementRect,
      observeElementOffset: virtualCore.observeElementOffset,
      scrollToFn: virtualCore.elementScroll,
      ...vue.unref(options)
    }))
  );
}
function useWindowVirtualizer(options) {
  return useVirtualizerBase(
    vue.computed(() => ({
      getScrollElement: () => typeof document !== "undefined" ? window : null,
      observeElementRect: virtualCore.observeWindowRect,
      observeElementOffset: virtualCore.observeWindowOffset,
      scrollToFn: virtualCore.windowScroll,
      initialOffset: () => typeof document !== "undefined" ? window.scrollY : 0,
      ...vue.unref(options)
    }))
  );
}
exports.useVirtualizer = useVirtualizer;
exports.useWindowVirtualizer = useWindowVirtualizer;
Object.keys(virtualCore).forEach((k) => {
  if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: () => virtualCore[k]
  });
});
//# sourceMappingURL=index.cjs.map
