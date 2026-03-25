import { defineComponent, ref, provide, onMounted, openBlock, createElementBlock, normalizeClass, unref, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import { breadcrumbKey } from './constants.mjs';
import { breadcrumbProps } from './breadcrumb.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElBreadcrumb"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: breadcrumbProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("breadcrumb");
    const breadcrumb = ref();
    provide(breadcrumbKey, props);
    onMounted(() => {
      const items = breadcrumb.value.querySelectorAll(`.${ns.e("item")}`);
      if (items.length) {
        items[items.length - 1].setAttribute("aria-current", "page");
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "breadcrumb",
        ref: breadcrumb,
        class: normalizeClass(unref(ns).b()),
        "aria-label": "Breadcrumb",
        role: "navigation"
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var Breadcrumb = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/breadcrumb/src/breadcrumb.vue"]]);

export { Breadcrumb as default };
//# sourceMappingURL=breadcrumb2.mjs.map
