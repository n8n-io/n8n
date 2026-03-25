'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$3 = require('../../popper/index.js');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var tooltip = require('./tooltip.js');
var trigger = require('./trigger2.js');
var content = require('./content2.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-popper-container/index.js');
var index$1 = require('../../../hooks/use-id/index.js');
var index$2 = require('../../../hooks/use-delayed-toggle/index.js');
var types = require('../../../utils/types.js');
var arrow = require('../../popper/src/arrow2.js');

const _hoisted_1 = ["innerHTML"];
const _hoisted_2 = { key: 1 };
const __default__ = vue.defineComponent({
  name: "ElTooltip"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: tooltip.useTooltipProps,
  emits: tooltip.tooltipEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    index.usePopperContainer();
    const id = index$1.useId();
    const popperRef = vue.ref();
    const contentRef = vue.ref();
    const updatePopper = () => {
      var _a;
      const popperComponent = vue.unref(popperRef);
      if (popperComponent) {
        (_a = popperComponent.popperInstanceRef) == null ? void 0 : _a.update();
      }
    };
    const open = vue.ref(false);
    const toggleReason = vue.ref();
    const { show, hide, hasUpdateHandler } = tooltip.useTooltipModelToggle({
      indicator: open,
      toggleReason
    });
    const { onOpen, onClose } = index$2.useDelayedToggle({
      showAfter: vue.toRef(props, "showAfter"),
      hideAfter: vue.toRef(props, "hideAfter"),
      autoClose: vue.toRef(props, "autoClose"),
      open: show,
      close: hide
    });
    const controlled = vue.computed(() => types.isBoolean(props.visible) && !hasUpdateHandler.value);
    vue.provide(constants.TOOLTIP_INJECTION_KEY, {
      controlled,
      id,
      open: vue.readonly(open),
      trigger: vue.toRef(props, "trigger"),
      onOpen: (event) => {
        onOpen(event);
      },
      onClose: (event) => {
        onClose(event);
      },
      onToggle: (event) => {
        if (vue.unref(open)) {
          onClose(event);
        } else {
          onOpen(event);
        }
      },
      onShow: () => {
        emit("show", toggleReason.value);
      },
      onHide: () => {
        emit("hide", toggleReason.value);
      },
      onBeforeShow: () => {
        emit("before-show", toggleReason.value);
      },
      onBeforeHide: () => {
        emit("before-hide", toggleReason.value);
      },
      updatePopper
    });
    vue.watch(() => props.disabled, (disabled) => {
      if (disabled && open.value) {
        open.value = false;
      }
    });
    const isFocusInsideContent = (event) => {
      var _a, _b;
      const popperContent = (_b = (_a = contentRef.value) == null ? void 0 : _a.contentRef) == null ? void 0 : _b.popperContentRef;
      const activeElement = (event == null ? void 0 : event.relatedTarget) || document.activeElement;
      return popperContent && popperContent.contains(activeElement);
    };
    vue.onDeactivated(() => open.value && hide());
    expose({
      popperRef,
      contentRef,
      isFocusInsideContent,
      updatePopper,
      onOpen,
      onClose,
      hide
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.unref(index$3.ElPopper), {
        ref_key: "popperRef",
        ref: popperRef,
        role: _ctx.role
      }, {
        default: vue.withCtx(() => [
          vue.createVNode(trigger["default"], {
            disabled: _ctx.disabled,
            trigger: _ctx.trigger,
            "trigger-keys": _ctx.triggerKeys,
            "virtual-ref": _ctx.virtualRef,
            "virtual-triggering": _ctx.virtualTriggering
          }, {
            default: vue.withCtx(() => [
              _ctx.$slots.default ? vue.renderSlot(_ctx.$slots, "default", { key: 0 }) : vue.createCommentVNode("v-if", true)
            ]),
            _: 3
          }, 8, ["disabled", "trigger", "trigger-keys", "virtual-ref", "virtual-triggering"]),
          vue.createVNode(content["default"], {
            ref_key: "contentRef",
            ref: contentRef,
            "aria-label": _ctx.ariaLabel,
            "boundaries-padding": _ctx.boundariesPadding,
            content: _ctx.content,
            disabled: _ctx.disabled,
            effect: _ctx.effect,
            enterable: _ctx.enterable,
            "fallback-placements": _ctx.fallbackPlacements,
            "hide-after": _ctx.hideAfter,
            "gpu-acceleration": _ctx.gpuAcceleration,
            offset: _ctx.offset,
            persistent: _ctx.persistent,
            "popper-class": _ctx.popperClass,
            "popper-style": _ctx.popperStyle,
            placement: _ctx.placement,
            "popper-options": _ctx.popperOptions,
            pure: _ctx.pure,
            "raw-content": _ctx.rawContent,
            "reference-el": _ctx.referenceEl,
            "trigger-target-el": _ctx.triggerTargetEl,
            "show-after": _ctx.showAfter,
            strategy: _ctx.strategy,
            teleported: _ctx.teleported,
            transition: _ctx.transition,
            "virtual-triggering": _ctx.virtualTriggering,
            "z-index": _ctx.zIndex,
            "append-to": _ctx.appendTo
          }, {
            default: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "content", {}, () => [
                _ctx.rawContent ? (vue.openBlock(), vue.createElementBlock("span", {
                  key: 0,
                  innerHTML: _ctx.content
                }, null, 8, _hoisted_1)) : (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, vue.toDisplayString(_ctx.content), 1))
              ]),
              _ctx.showArrow ? (vue.openBlock(), vue.createBlock(vue.unref(arrow["default"]), {
                key: 0,
                "arrow-offset": _ctx.arrowOffset
              }, null, 8, ["arrow-offset"])) : vue.createCommentVNode("v-if", true)
            ]),
            _: 3
          }, 8, ["aria-label", "boundaries-padding", "content", "disabled", "effect", "enterable", "fallback-placements", "hide-after", "gpu-acceleration", "offset", "persistent", "popper-class", "popper-style", "placement", "popper-options", "pure", "raw-content", "reference-el", "trigger-target-el", "show-after", "strategy", "teleported", "transition", "virtual-triggering", "z-index", "append-to"])
        ]),
        _: 3
      }, 8, ["role"]);
    };
  }
});
var Tooltip = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip/src/tooltip.vue"]]);

exports["default"] = Tooltip;
//# sourceMappingURL=tooltip2.js.map
