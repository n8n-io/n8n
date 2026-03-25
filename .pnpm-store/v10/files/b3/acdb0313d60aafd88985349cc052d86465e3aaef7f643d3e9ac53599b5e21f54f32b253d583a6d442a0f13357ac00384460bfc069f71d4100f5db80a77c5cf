'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

function useKeyRender(table) {
  const observer = vue.ref();
  const initWatchDom = () => {
    const el = table.vnode.el;
    const columnsWrapper = el.querySelector(".hidden-columns");
    const config = { childList: true, subtree: true };
    const updateOrderFns = table.store.states.updateOrderFns;
    observer.value = new MutationObserver(() => {
      updateOrderFns.forEach((fn) => fn());
    });
    observer.value.observe(columnsWrapper, config);
  };
  vue.onMounted(() => {
    initWatchDom();
  });
  vue.onUnmounted(() => {
    var _a;
    (_a = observer.value) == null ? void 0 : _a.disconnect();
  });
}

exports["default"] = useKeyRender;
//# sourceMappingURL=key-render-helper.js.map
