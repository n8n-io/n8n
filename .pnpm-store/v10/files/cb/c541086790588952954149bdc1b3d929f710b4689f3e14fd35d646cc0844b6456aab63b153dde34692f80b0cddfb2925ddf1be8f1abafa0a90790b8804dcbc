import { h, defineComponent, computed, toRef, openBlock, createElementBlock, normalizeStyle, renderSlot, createElementVNode, unref, createBlock, createCommentVNode } from "vue";
import { useVueFlow } from "@vue-flow/core";
var BackgroundVariant = /* @__PURE__ */ ((BackgroundVariant2) => {
  BackgroundVariant2["Lines"] = "lines";
  BackgroundVariant2["Dots"] = "dots";
  return BackgroundVariant2;
})(BackgroundVariant || {});
const LinePattern = function({ dimensions, size, color }) {
  return h("path", {
    "stroke": color,
    "stroke-width": size,
    "d": `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`
  });
};
const DotPattern = function({ radius, color }) {
  return h("circle", { cx: radius, cy: radius, r: radius, fill: color });
};
({
  [BackgroundVariant.Lines]: LinePattern,
  [BackgroundVariant.Dots]: DotPattern
});
const DefaultBgColors = {
  [BackgroundVariant.Dots]: "#81818a",
  [BackgroundVariant.Lines]: "#eee"
};
const _hoisted_1 = ["id", "x", "y", "width", "height", "patternTransform"];
const _hoisted_2 = {
  key: 2,
  height: "100",
  width: "100"
};
const _hoisted_3 = ["fill"];
const _hoisted_4 = ["x", "y", "fill"];
const __default__ = {
  name: "Background",
  compatConfig: { MODE: 3 }
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: {
    id: {},
    variant: { default: () => BackgroundVariant.Dots },
    gap: { default: 20 },
    size: { default: 1 },
    lineWidth: { default: 1 },
    patternColor: {},
    color: {},
    bgColor: {},
    height: { default: 100 },
    width: { default: 100 },
    x: { default: 0 },
    y: { default: 0 },
    offset: { default: 0 }
  },
  setup(__props) {
    const { id: vueFlowId, viewport } = useVueFlow();
    const background = computed(() => {
      const zoom = viewport.value.zoom;
      const [gapX, gapY] = Array.isArray(__props.gap) ? __props.gap : [__props.gap, __props.gap];
      const scaledGap = [gapX * zoom || 1, gapY * zoom || 1];
      const scaledSize = __props.size * zoom;
      const [offsetX, offsetY] = Array.isArray(__props.offset) ? __props.offset : [__props.offset, __props.offset];
      const scaledOffset = [offsetX * zoom || 1 + scaledGap[0] / 2, offsetY * zoom || 1 + scaledGap[1] / 2];
      return {
        scaledGap,
        offset: scaledOffset,
        size: scaledSize
      };
    });
    const patternId = toRef(() => `pattern-${vueFlowId}${__props.id ? `-${__props.id}` : ""}`);
    const patternColor = toRef(() => __props.color || __props.patternColor || DefaultBgColors[__props.variant || BackgroundVariant.Dots]);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("svg", {
        class: "vue-flow__background vue-flow__container",
        style: normalizeStyle({
          height: `${_ctx.height > 100 ? 100 : _ctx.height}%`,
          width: `${_ctx.width > 100 ? 100 : _ctx.width}%`
        })
      }, [
        renderSlot(_ctx.$slots, "pattern-container", { id: patternId.value }, () => [
          createElementVNode("pattern", {
            id: patternId.value,
            x: unref(viewport).x % background.value.scaledGap[0],
            y: unref(viewport).y % background.value.scaledGap[1],
            width: background.value.scaledGap[0],
            height: background.value.scaledGap[1],
            patternTransform: `translate(-${background.value.offset[0]},-${background.value.offset[1]})`,
            patternUnits: "userSpaceOnUse"
          }, [
            renderSlot(_ctx.$slots, "pattern", {}, () => [
              _ctx.variant === unref(BackgroundVariant).Lines ? (openBlock(), createBlock(unref(LinePattern), {
                key: 0,
                size: _ctx.lineWidth,
                color: patternColor.value,
                dimensions: background.value.scaledGap
              }, null, 8, ["size", "color", "dimensions"])) : _ctx.variant === unref(BackgroundVariant).Dots ? (openBlock(), createBlock(unref(DotPattern), {
                key: 1,
                color: patternColor.value,
                radius: background.value.size / 2
              }, null, 8, ["color", "radius"])) : createCommentVNode("", true),
              _ctx.bgColor ? (openBlock(), createElementBlock("svg", _hoisted_2, [
                createElementVNode("rect", {
                  width: "100%",
                  height: "100%",
                  fill: _ctx.bgColor
                }, null, 8, _hoisted_3)
              ])) : createCommentVNode("", true)
            ])
          ], 8, _hoisted_1)
        ]),
        createElementVNode("rect", {
          x: _ctx.x,
          y: _ctx.y,
          width: "100%",
          height: "100%",
          fill: `url(#${patternId.value})`
        }, null, 8, _hoisted_4),
        renderSlot(_ctx.$slots, "default", { id: patternId.value })
      ], 4);
    };
  }
});
export {
  _sfc_main as Background,
  BackgroundVariant
};
