'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../tooltip/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var popover = require('./popover.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var style = require('../../../utils/dom/style.js');

const updateEventKeyRaw = `onUpdate:visible`;
const __default__ = vue.defineComponent({
  name: "ElPopover"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: popover.popoverProps,
  emits: popover.popoverEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const onUpdateVisible = vue.computed(() => {
      return props[updateEventKeyRaw];
    });
    const ns = index.useNamespace("popover");
    const tooltipRef = vue.ref();
    const popperRef = vue.computed(() => {
      var _a;
      return (_a = vue.unref(tooltipRef)) == null ? void 0 : _a.popperRef;
    });
    const style$1 = vue.computed(() => {
      return [
        {
          width: style.addUnit(props.width)
        },
        props.popperStyle
      ];
    });
    const kls = vue.computed(() => {
      return [ns.b(), props.popperClass, { [ns.m("plain")]: !!props.content }];
    });
    const gpuAcceleration = vue.computed(() => {
      return props.transition === `${ns.namespace.value}-fade-in-linear`;
    });
    const hide = () => {
      var _a;
      (_a = tooltipRef.value) == null ? void 0 : _a.hide();
    };
    const beforeEnter = () => {
      emit("before-enter");
    };
    const beforeLeave = () => {
      emit("before-leave");
    };
    const afterEnter = () => {
      emit("after-enter");
    };
    const afterLeave = () => {
      emit("update:visible", false);
      emit("after-leave");
    };
    expose({
      popperRef,
      hide
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index$1.ElTooltip), vue.mergeProps({
        ref_key: "tooltipRef",
        ref: tooltipRef
      }, _ctx.$attrs, {
        trigger: _ctx.trigger,
        placement: _ctx.placement,
        disabled: _ctx.disabled,
        visible: _ctx.visible,
        transition: _ctx.transition,
        "popper-options": _ctx.popperOptions,
        tabindex: _ctx.tabindex,
        content: _ctx.content,
        offset: _ctx.offset,
        "show-after": _ctx.showAfter,
        "hide-after": _ctx.hideAfter,
        "auto-close": _ctx.autoClose,
        "show-arrow": _ctx.showArrow,
        "aria-label": _ctx.title,
        effect: _ctx.effect,
        enterable: _ctx.enterable,
        "popper-class": vue.unref(kls),
        "popper-style": vue.unref(style$1),
        teleported: _ctx.teleported,
        persistent: _ctx.persistent,
        "gpu-acceleration": vue.unref(gpuAcceleration),
        "onUpdate:visible": vue.unref(onUpdateVisible),
        onBeforeShow: beforeEnter,
        onBeforeHide: beforeLeave,
        onShow: afterEnter,
        onHide: afterLeave
      }), {
        content: vue.withCtx(() => [
          _ctx.title ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("title")),
            role: "title"
          }, vue.toDisplayString(_ctx.title), 3)) : vue.createCommentVNode("v-if", true),
          vue.renderSlot(_ctx.$slots, "default", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.content), 1)
          ])
        ]),
        default: vue.withCtx(() => [
          _ctx.$slots.reference ? vue.renderSlot(_ctx.$slots, "reference", { key: 0 }) : vue.createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 16, ["trigger", "placement", "disabled", "visible", "transition", "popper-options", "tabindex", "content", "offset", "show-after", "hide-after", "auto-close", "show-arrow", "aria-label", "effect", "enterable", "popper-class", "popper-style", "teleported", "persistent", "gpu-acceleration", "onUpdate:visible"]);
    };
  }
});
var Popover = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/popover/src/popover.vue"]]);

exports["default"] = Popover;
//# sourceMappingURL=popover2.js.map
