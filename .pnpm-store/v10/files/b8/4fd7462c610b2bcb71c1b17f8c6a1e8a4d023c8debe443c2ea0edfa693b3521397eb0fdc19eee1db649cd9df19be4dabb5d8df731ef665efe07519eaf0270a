'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$4 = require('../../button/index.js');
var index$3 = require('../../icon/index.js');
var index$2 = require('../../tooltip/index.js');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var popconfirm = require('./popconfirm.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var style = require('../../../utils/dom/style.js');

const __default__ = vue.defineComponent({
  name: "ElPopconfirm"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: popconfirm.popconfirmProps,
  emits: popconfirm.popconfirmEmits,
  setup(__props, { emit }) {
    const props = __props;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("popconfirm");
    const tooltipRef = vue.ref();
    const hidePopper = () => {
      var _a, _b;
      (_b = (_a = tooltipRef.value) == null ? void 0 : _a.onClose) == null ? void 0 : _b.call(_a);
    };
    const style$1 = vue.computed(() => {
      return {
        width: style.addUnit(props.width)
      };
    });
    const confirm = (e) => {
      emit("confirm", e);
      hidePopper();
    };
    const cancel = (e) => {
      emit("cancel", e);
      hidePopper();
    };
    const finalConfirmButtonText = vue.computed(() => props.confirmButtonText || t("el.popconfirm.confirmButtonText"));
    const finalCancelButtonText = vue.computed(() => props.cancelButtonText || t("el.popconfirm.cancelButtonText"));
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index$2.ElTooltip), vue.mergeProps({
        ref_key: "tooltipRef",
        ref: tooltipRef,
        trigger: "click",
        effect: "light"
      }, _ctx.$attrs, {
        "popper-class": `${vue.unref(ns).namespace.value}-popover`,
        "popper-style": vue.unref(style$1),
        teleported: _ctx.teleported,
        "fallback-placements": ["bottom", "top", "right", "left"],
        "hide-after": _ctx.hideAfter,
        persistent: _ctx.persistent
      }), {
        content: vue.withCtx(() => [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).b())
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("main"))
            }, [
              !_ctx.hideIcon && _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$3.ElIcon), {
                key: 0,
                class: vue.normalizeClass(vue.unref(ns).e("icon")),
                style: vue.normalizeStyle({ color: _ctx.iconColor })
              }, {
                default: vue.withCtx(() => [
                  (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
                ]),
                _: 1
              }, 8, ["class", "style"])) : vue.createCommentVNode("v-if", true),
              vue.createTextVNode(" " + vue.toDisplayString(_ctx.title), 1)
            ], 2),
            vue.createElementVNode("div", {
              class: vue.normalizeClass(vue.unref(ns).e("action"))
            }, [
              vue.createVNode(vue.unref(index$4.ElButton), {
                size: "small",
                type: _ctx.cancelButtonType === "text" ? "" : _ctx.cancelButtonType,
                text: _ctx.cancelButtonType === "text",
                onClick: cancel
              }, {
                default: vue.withCtx(() => [
                  vue.createTextVNode(vue.toDisplayString(vue.unref(finalCancelButtonText)), 1)
                ]),
                _: 1
              }, 8, ["type", "text"]),
              vue.createVNode(vue.unref(index$4.ElButton), {
                size: "small",
                type: _ctx.confirmButtonType === "text" ? "" : _ctx.confirmButtonType,
                text: _ctx.confirmButtonType === "text",
                onClick: confirm
              }, {
                default: vue.withCtx(() => [
                  vue.createTextVNode(vue.toDisplayString(vue.unref(finalConfirmButtonText)), 1)
                ]),
                _: 1
              }, 8, ["type", "text"])
            ], 2)
          ], 2)
        ]),
        default: vue.withCtx(() => [
          _ctx.$slots.reference ? vue.renderSlot(_ctx.$slots, "reference", { key: 0 }) : vue.createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 16, ["popper-class", "popper-style", "teleported", "hide-after", "persistent"]);
    };
  }
});
var Popconfirm = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/popconfirm/src/popconfirm.vue"]]);

exports["default"] = Popconfirm;
//# sourceMappingURL=popconfirm2.js.map
