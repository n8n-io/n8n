import { elementScroll, observeElementOffset, observeElementRect, windowScroll, observeWindowOffset, observeWindowRect, Virtualizer } from "@tanstack/virtual-core";
export * from "@tanstack/virtual-core";
import { computed, unref, shallowRef, watch, triggerRef, onScopeDispose } from "vue";
function useVirtualizerBase(options) {
  const virtualizer = new Virtualizer(unref(options));
  const state = shallowRef(virtualizer);
  const cleanup = virtualizer._didMount();
  watch(
    () => unref(options).getScrollElement(),
    (el) => {
      if (el) {
        virtualizer._willUpdate();
      }
    },
    {
      immediate: true
    }
  );
  watch(
    () => unref(options),
    (options2) => {
      virtualizer.setOptions({
        ...options2,
        onChange: (instance, sync) => {
          var _a;
          triggerRef(state);
          (_a = options2.onChange) == null ? void 0 : _a.call(options2, instance, sync);
        }
      });
      virtualizer._willUpdate();
      triggerRef(state);
    },
    {
      immediate: true
    }
  );
  onScopeDispose(cleanup);
  return state;
}
function useVirtualizer(options) {
  return useVirtualizerBase(
    computed(() => ({
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      ...unref(options)
    }))
  );
}
function useWindowVirtualizer(options) {
  return useVirtualizerBase(
    computed(() => ({
      getScrollElement: () => typeof document !== "undefined" ? window : null,
      observeElementRect: observeWindowRect,
      observeElementOffset: observeWindowOffset,
      scrollToFn: windowScroll,
      initialOffset: () => typeof document !== "undefined" ? window.scrollY : 0,
      ...unref(options)
    }))
  );
}
export {
  useVirtualizer,
  useWindowVirtualizer
};
//# sourceMappingURL=index.js.map
