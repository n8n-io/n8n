import { defineComponent, provide, reactive, toRef, openBlock, createElementBlock, normalizeClass, unref, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import { buttonGroupProps } from './button-group.mjs';
import { buttonGroupContextKey } from './constants.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElButtonGroup"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: buttonGroupProps,
  setup(__props) {
    const props = __props;
    provide(buttonGroupContextKey, reactive({
      size: toRef(props, "size"),
      type: toRef(props, "type")
    }));
    const ns = useNamespace("button");
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(`${unref(ns).b("group")}`)
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var ButtonGroup = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/button/src/button-group.vue"]]);

export { ButtonGroup as default };
//# sourceMappingURL=button-group2.mjs.map
