import { defineComponent, computed, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, renderSlot, createBlock, resolveDynamicComponent, createCommentVNode, toDisplayString } from 'vue';
import '../../../hooks/index.mjs';
import { resultProps, IconMap, IconComponentMap } from './result.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElResult"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: resultProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("result");
    const resultIcon = computed(() => {
      const icon = props.icon;
      const iconClass = icon && IconMap[icon] ? IconMap[icon] : "icon-info";
      const iconComponent = IconComponentMap[iconClass] || IconComponentMap["icon-info"];
      return {
        class: iconClass,
        component: iconComponent
      };
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(ns).b())
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("icon"))
        }, [
          renderSlot(_ctx.$slots, "icon", {}, () => [
            unref(resultIcon).component ? (openBlock(), createBlock(resolveDynamicComponent(unref(resultIcon).component), {
              key: 0,
              class: normalizeClass(unref(resultIcon).class)
            }, null, 8, ["class"])) : createCommentVNode("v-if", true)
          ])
        ], 2),
        _ctx.title || _ctx.$slots.title ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(ns).e("title"))
        }, [
          renderSlot(_ctx.$slots, "title", {}, () => [
            createElementVNode("p", null, toDisplayString(_ctx.title), 1)
          ])
        ], 2)) : createCommentVNode("v-if", true),
        _ctx.subTitle || _ctx.$slots["sub-title"] ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(unref(ns).e("subtitle"))
        }, [
          renderSlot(_ctx.$slots, "sub-title", {}, () => [
            createElementVNode("p", null, toDisplayString(_ctx.subTitle), 1)
          ])
        ], 2)) : createCommentVNode("v-if", true),
        _ctx.$slots.extra ? (openBlock(), createElementBlock("div", {
          key: 2,
          class: normalizeClass(unref(ns).e("extra"))
        }, [
          renderSlot(_ctx.$slots, "extra")
        ], 2)) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Result = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/result/src/result.vue"]]);

export { Result as default };
//# sourceMappingURL=result2.mjs.map
