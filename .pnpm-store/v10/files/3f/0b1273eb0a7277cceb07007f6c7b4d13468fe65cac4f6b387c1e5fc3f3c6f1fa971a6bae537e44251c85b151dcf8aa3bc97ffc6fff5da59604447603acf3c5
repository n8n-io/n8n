import { defineComponent, ref, computed, openBlock, createBlock, Teleport as Teleport$1, createElementVNode, normalizeClass, unref, normalizeStyle, renderSlot, createCommentVNode } from 'vue';
import '../../../hooks/index.mjs';
import { teleportProps } from './teleport.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "teleport",
  props: teleportProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = useNamespace("teleport");
    const containerRef = ref();
    const containerStyle = computed(() => {
      return props.container === "body" ? [
        props.style,
        {
          position: "absolute",
          top: `0px`,
          left: `0px`,
          zIndex: props.zIndex
        }
      ] : {};
    });
    expose({
      containerRef
    });
    return (_ctx, _cache) => {
      return _ctx.container ? (openBlock(), createBlock(Teleport$1, {
        key: 0,
        to: _ctx.container,
        disabled: _ctx.disabled
      }, [
        createElementVNode("div", {
          ref_key: "containerRef",
          ref: containerRef,
          class: normalizeClass(unref(ns).b()),
          style: normalizeStyle(unref(containerStyle))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 6)
      ], 8, ["to", "disabled"])) : createCommentVNode("v-if", true);
    };
  }
});
var Teleport = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/teleport/src/teleport.vue"]]);

export { Teleport as default };
//# sourceMappingURL=teleport2.mjs.map
