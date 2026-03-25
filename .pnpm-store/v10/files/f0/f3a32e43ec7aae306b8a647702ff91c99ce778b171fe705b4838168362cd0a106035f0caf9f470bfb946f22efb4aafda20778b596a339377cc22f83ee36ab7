'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var dom = require('@floating-ui/dom');
require('../../../hooks/index.js');
require('../../visual-hidden/index.js');
var constants = require('./constants.js');
var content = require('./content.js');
var common = require('./common.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-floating/index.js');
var index$1 = require('../../../hooks/use-z-index/index.js');
var index$2 = require('../../../hooks/use-namespace/index.js');
var visualHidden = require('../../visual-hidden/src/visual-hidden2.js');

const _hoisted_1 = ["data-side"];
const __default__ = vue.defineComponent({
  name: "ElTooltipV2Content"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: { ...content.tooltipV2ContentProps, ...common.tooltipV2CommonProps },
  setup(__props) {
    const props = __props;
    const { triggerRef, contentId } = vue.inject(constants.tooltipV2RootKey);
    const placement = vue.ref(props.placement);
    const strategy = vue.ref(props.strategy);
    const arrowRef = vue.ref(null);
    const { referenceRef, contentRef, middlewareData, x, y, update } = index.useFloating({
      placement,
      strategy,
      middleware: vue.computed(() => {
        const middleware = [dom.offset(props.offset)];
        if (props.showArrow) {
          middleware.push(index.arrowMiddleware({
            arrowRef
          }));
        }
        return middleware;
      })
    });
    const zIndex = index$1.useZIndex().nextZIndex();
    const ns = index$2.useNamespace("tooltip-v2");
    const side = vue.computed(() => {
      return placement.value.split("-")[0];
    });
    const contentStyle = vue.computed(() => {
      return {
        position: vue.unref(strategy),
        top: `${vue.unref(y) || 0}px`,
        left: `${vue.unref(x) || 0}px`,
        zIndex
      };
    });
    const arrowStyle = vue.computed(() => {
      if (!props.showArrow)
        return {};
      const { arrow } = vue.unref(middlewareData);
      return {
        [`--${ns.namespace.value}-tooltip-v2-arrow-x`]: `${arrow == null ? void 0 : arrow.x}px` || "",
        [`--${ns.namespace.value}-tooltip-v2-arrow-y`]: `${arrow == null ? void 0 : arrow.y}px` || ""
      };
    });
    const contentClass = vue.computed(() => [
      ns.e("content"),
      ns.is("dark", props.effect === "dark"),
      ns.is(vue.unref(strategy)),
      props.contentClass
    ]);
    vue.watch(arrowRef, () => update());
    vue.watch(() => props.placement, (val) => placement.value = val);
    vue.onMounted(() => {
      vue.watch(() => props.reference || triggerRef.value, (el) => {
        referenceRef.value = el || void 0;
      }, {
        immediate: true
      });
    });
    vue.provide(constants.tooltipV2ContentKey, { arrowRef });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "contentRef",
        ref: contentRef,
        style: vue.normalizeStyle(vue.unref(contentStyle)),
        "data-tooltip-v2-root": ""
      }, [
        !_ctx.nowrap ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          "data-side": vue.unref(side),
          class: vue.normalizeClass(vue.unref(contentClass))
        }, [
          vue.renderSlot(_ctx.$slots, "default", {
            contentStyle: vue.unref(contentStyle),
            contentClass: vue.unref(contentClass)
          }),
          vue.createVNode(vue.unref(visualHidden["default"]), {
            id: vue.unref(contentId),
            role: "tooltip"
          }, {
            default: vue.withCtx(() => [
              _ctx.ariaLabel ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                vue.createTextVNode(vue.toDisplayString(_ctx.ariaLabel), 1)
              ], 64)) : vue.renderSlot(_ctx.$slots, "default", { key: 1 })
            ]),
            _: 3
          }, 8, ["id"]),
          vue.renderSlot(_ctx.$slots, "arrow", {
            style: vue.normalizeStyle(vue.unref(arrowStyle)),
            side: vue.unref(side)
          })
        ], 10, _hoisted_1)) : vue.createCommentVNode("v-if", true)
      ], 4);
    };
  }
});
var TooltipV2Content = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/content.vue"]]);

exports["default"] = TooltipV2Content;
//# sourceMappingURL=content2.js.map
