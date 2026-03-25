import { defineComponent, inject, ref, computed, unref, watch, onMounted, provide, openBlock, createElementBlock, normalizeStyle, normalizeClass, renderSlot, createVNode, withCtx, Fragment, createTextVNode, toDisplayString, createCommentVNode } from 'vue';
import { offset } from '@floating-ui/dom';
import '../../../hooks/index.mjs';
import '../../visual-hidden/index.mjs';
import { tooltipV2RootKey, tooltipV2ContentKey } from './constants.mjs';
import { tooltipV2ContentProps } from './content.mjs';
import { tooltipV2CommonProps } from './common.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useFloating, arrowMiddleware } from '../../../hooks/use-floating/index.mjs';
import { useZIndex } from '../../../hooks/use-z-index/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import ElVisuallyHidden from '../../visual-hidden/src/visual-hidden2.mjs';

const _hoisted_1 = ["data-side"];
const __default__ = defineComponent({
  name: "ElTooltipV2Content"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: { ...tooltipV2ContentProps, ...tooltipV2CommonProps },
  setup(__props) {
    const props = __props;
    const { triggerRef, contentId } = inject(tooltipV2RootKey);
    const placement = ref(props.placement);
    const strategy = ref(props.strategy);
    const arrowRef = ref(null);
    const { referenceRef, contentRef, middlewareData, x, y, update } = useFloating({
      placement,
      strategy,
      middleware: computed(() => {
        const middleware = [offset(props.offset)];
        if (props.showArrow) {
          middleware.push(arrowMiddleware({
            arrowRef
          }));
        }
        return middleware;
      })
    });
    const zIndex = useZIndex().nextZIndex();
    const ns = useNamespace("tooltip-v2");
    const side = computed(() => {
      return placement.value.split("-")[0];
    });
    const contentStyle = computed(() => {
      return {
        position: unref(strategy),
        top: `${unref(y) || 0}px`,
        left: `${unref(x) || 0}px`,
        zIndex
      };
    });
    const arrowStyle = computed(() => {
      if (!props.showArrow)
        return {};
      const { arrow } = unref(middlewareData);
      return {
        [`--${ns.namespace.value}-tooltip-v2-arrow-x`]: `${arrow == null ? void 0 : arrow.x}px` || "",
        [`--${ns.namespace.value}-tooltip-v2-arrow-y`]: `${arrow == null ? void 0 : arrow.y}px` || ""
      };
    });
    const contentClass = computed(() => [
      ns.e("content"),
      ns.is("dark", props.effect === "dark"),
      ns.is(unref(strategy)),
      props.contentClass
    ]);
    watch(arrowRef, () => update());
    watch(() => props.placement, (val) => placement.value = val);
    onMounted(() => {
      watch(() => props.reference || triggerRef.value, (el) => {
        referenceRef.value = el || void 0;
      }, {
        immediate: true
      });
    });
    provide(tooltipV2ContentKey, { arrowRef });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "contentRef",
        ref: contentRef,
        style: normalizeStyle(unref(contentStyle)),
        "data-tooltip-v2-root": ""
      }, [
        !_ctx.nowrap ? (openBlock(), createElementBlock("div", {
          key: 0,
          "data-side": unref(side),
          class: normalizeClass(unref(contentClass))
        }, [
          renderSlot(_ctx.$slots, "default", {
            contentStyle: unref(contentStyle),
            contentClass: unref(contentClass)
          }),
          createVNode(unref(ElVisuallyHidden), {
            id: unref(contentId),
            role: "tooltip"
          }, {
            default: withCtx(() => [
              _ctx.ariaLabel ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createTextVNode(toDisplayString(_ctx.ariaLabel), 1)
              ], 64)) : renderSlot(_ctx.$slots, "default", { key: 1 })
            ]),
            _: 3
          }, 8, ["id"]),
          renderSlot(_ctx.$slots, "arrow", {
            style: normalizeStyle(unref(arrowStyle)),
            side: unref(side)
          })
        ], 10, _hoisted_1)) : createCommentVNode("v-if", true)
      ], 4);
    };
  }
});
var TooltipV2Content = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/content.vue"]]);

export { TooltipV2Content as default };
//# sourceMappingURL=content2.mjs.map
