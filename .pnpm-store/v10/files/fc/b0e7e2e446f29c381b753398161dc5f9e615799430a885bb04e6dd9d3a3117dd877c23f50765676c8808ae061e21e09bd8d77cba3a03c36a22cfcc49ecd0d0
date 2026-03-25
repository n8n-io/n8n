import { defineComponent, computed, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, normalizeStyle, createBlock, withCtx, resolveDynamicComponent, createCommentVNode, renderSlot, toDisplayString } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import '../../../hooks/index.mjs';
import { timelineItemProps } from './timeline-item.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElTimelineItem"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: timelineItemProps,
  setup(__props) {
    const props = __props;
    const ns = useNamespace("timeline-item");
    const defaultNodeKls = computed(() => [
      ns.e("node"),
      ns.em("node", props.size || ""),
      ns.em("node", props.type || ""),
      ns.is("hollow", props.hollow)
    ]);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("li", {
        class: normalizeClass([unref(ns).b(), { [unref(ns).e("center")]: _ctx.center }])
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("tail"))
        }, null, 2),
        !_ctx.$slots.dot ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(defaultNodeKls)),
          style: normalizeStyle({
            backgroundColor: _ctx.color
          })
        }, [
          _ctx.icon ? (openBlock(), createBlock(unref(ElIcon), {
            key: 0,
            class: normalizeClass(unref(ns).e("icon"))
          }, {
            default: withCtx(() => [
              (openBlock(), createBlock(resolveDynamicComponent(_ctx.icon)))
            ]),
            _: 1
          }, 8, ["class"])) : createCommentVNode("v-if", true)
        ], 6)) : createCommentVNode("v-if", true),
        _ctx.$slots.dot ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(unref(ns).e("dot"))
        }, [
          renderSlot(_ctx.$slots, "dot")
        ], 2)) : createCommentVNode("v-if", true),
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("wrapper"))
        }, [
          !_ctx.hideTimestamp && _ctx.placement === "top" ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass([unref(ns).e("timestamp"), unref(ns).is("top")])
          }, toDisplayString(_ctx.timestamp), 3)) : createCommentVNode("v-if", true),
          createElementVNode("div", {
            class: normalizeClass(unref(ns).e("content"))
          }, [
            renderSlot(_ctx.$slots, "default")
          ], 2),
          !_ctx.hideTimestamp && _ctx.placement === "bottom" ? (openBlock(), createElementBlock("div", {
            key: 1,
            class: normalizeClass([unref(ns).e("timestamp"), unref(ns).is("bottom")])
          }, toDisplayString(_ctx.timestamp), 3)) : createCommentVNode("v-if", true)
        ], 2)
      ], 2);
    };
  }
});
var TimelineItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/timeline/src/timeline-item.vue"]]);

export { TimelineItem as default };
//# sourceMappingURL=timeline-item2.mjs.map
