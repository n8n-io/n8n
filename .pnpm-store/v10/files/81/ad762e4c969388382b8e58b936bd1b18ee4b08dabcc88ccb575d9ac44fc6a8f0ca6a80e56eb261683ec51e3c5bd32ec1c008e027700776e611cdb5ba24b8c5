import { defineComponent, getCurrentInstance, inject, watch, onUnmounted, h } from 'vue';
import '../../../../utils/index.mjs';
import '../../../../hooks/index.mjs';
import useLayoutObserver from '../layout-observer.mjs';
import { removePopper } from '../util.mjs';
import { TABLE_INJECTION_KEY } from '../tokens.mjs';
import useRender from './render-helper.mjs';
import defaultProps from './defaults.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';
import { isClient } from '@vueuse/core';
import { rAF } from '../../../../utils/raf.mjs';
import { removeClass, addClass } from '../../../../utils/dom/style.mjs';

var TableBody = defineComponent({
  name: "ElTableBody",
  props: defaultProps,
  setup(props) {
    const instance = getCurrentInstance();
    const parent = inject(TABLE_INJECTION_KEY);
    const ns = useNamespace("table");
    const { wrappedRowRender, tooltipContent, tooltipTrigger } = useRender(props);
    const { onColumnsChange, onScrollableChange } = useLayoutObserver(parent);
    watch(props.store.states.hoverRow, (newVal, oldVal) => {
      if (!props.store.states.isComplex.value || !isClient)
        return;
      rAF(() => {
        const el = instance == null ? void 0 : instance.vnode.el;
        const rows = Array.from((el == null ? void 0 : el.children) || []).filter((e) => e == null ? void 0 : e.classList.contains(`${ns.e("row")}`));
        const oldRow = rows[oldVal];
        const newRow = rows[newVal];
        if (oldRow) {
          removeClass(oldRow, "hover-row");
        }
        if (newRow) {
          addClass(newRow, "hover-row");
        }
      });
    });
    onUnmounted(() => {
      var _a;
      (_a = removePopper) == null ? void 0 : _a();
    });
    return {
      ns,
      onColumnsChange,
      onScrollableChange,
      wrappedRowRender,
      tooltipContent,
      tooltipTrigger
    };
  },
  render() {
    const { wrappedRowRender, store } = this;
    const data = store.states.data.value || [];
    return h("tbody", { tabIndex: -1 }, [
      data.reduce((acc, row) => {
        return acc.concat(wrappedRowRender(row, acc.length));
      }, [])
    ]);
  }
});

export { TableBody as default };
//# sourceMappingURL=index.mjs.map
