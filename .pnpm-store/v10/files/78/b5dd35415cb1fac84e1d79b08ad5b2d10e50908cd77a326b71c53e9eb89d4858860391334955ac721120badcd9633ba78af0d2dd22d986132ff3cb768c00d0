import { defineComponent, openBlock, createElementBlock, normalizeClass, unref, renderSlot } from 'vue';
import { collapseProps, collapseEmits } from './collapse.mjs';
import { useCollapse, useCollapseDOM } from './use-collapse.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const __default__ = defineComponent({
  name: "ElCollapse"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: collapseProps,
  emits: collapseEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const { activeNames, setActiveNames } = useCollapse(props, emit);
    const { rootKls } = useCollapseDOM();
    expose({
      activeNames,
      setActiveNames
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(rootKls))
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var Collapse = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/collapse/src/collapse.vue"]]);

export { Collapse as default };
//# sourceMappingURL=collapse2.mjs.map
