import { ref, onMounted, onUnmounted } from 'vue';

function useKeyRender(table) {
  const observer = ref();
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
  onMounted(() => {
    initWatchDom();
  });
  onUnmounted(() => {
    var _a;
    (_a = observer.value) == null ? void 0 : _a.disconnect();
  });
}

export { useKeyRender as default };
//# sourceMappingURL=key-render-helper.mjs.map
