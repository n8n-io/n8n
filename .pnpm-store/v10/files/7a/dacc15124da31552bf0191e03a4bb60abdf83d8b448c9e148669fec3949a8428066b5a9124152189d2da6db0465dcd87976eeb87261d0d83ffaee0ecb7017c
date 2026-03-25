'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../hooks/index.js');
require('../../../utils/index.js');
require('../../popper/index.js');
var constants = require('./constants.js');
var content = require('./content.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-popper-container/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var event = require('../../../utils/dom/event.js');
var content$1 = require('../../popper/src/content2.js');

const __default__ = vue.defineComponent({
  name: "ElTooltipContent",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: content.useTooltipContentProps,
  setup(__props, { expose }) {
    const props = __props;
    const { selector } = index.usePopperContainerId();
    const ns = index$1.useNamespace("tooltip");
    const contentRef = vue.ref(null);
    const destroyed = vue.ref(false);
    const {
      controlled,
      id,
      open,
      trigger,
      onClose,
      onOpen,
      onShow,
      onHide,
      onBeforeShow,
      onBeforeHide
    } = vue.inject(constants.TOOLTIP_INJECTION_KEY, void 0);
    const transitionClass = vue.computed(() => {
      return props.transition || `${ns.namespace.value}-fade-in-linear`;
    });
    const persistentRef = vue.computed(() => {
      if (process.env.NODE_ENV === "test") {
        return true;
      }
      return props.persistent;
    });
    vue.onBeforeUnmount(() => {
      destroyed.value = true;
    });
    const shouldRender = vue.computed(() => {
      return vue.unref(persistentRef) ? true : vue.unref(open);
    });
    const shouldShow = vue.computed(() => {
      return props.disabled ? false : vue.unref(open);
    });
    const appendTo = vue.computed(() => {
      return props.appendTo || selector.value;
    });
    const contentStyle = vue.computed(() => {
      var _a;
      return (_a = props.style) != null ? _a : {};
    });
    const ariaHidden = vue.computed(() => !vue.unref(open));
    const onTransitionLeave = () => {
      onHide();
    };
    const stopWhenControlled = () => {
      if (vue.unref(controlled))
        return true;
    };
    const onContentEnter = event.composeEventHandlers(stopWhenControlled, () => {
      if (props.enterable && vue.unref(trigger) === "hover") {
        onOpen();
      }
    });
    const onContentLeave = event.composeEventHandlers(stopWhenControlled, () => {
      if (vue.unref(trigger) === "hover") {
        onClose();
      }
    });
    const onBeforeEnter = () => {
      var _a, _b;
      (_b = (_a = contentRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
      onBeforeShow == null ? void 0 : onBeforeShow();
    };
    const onBeforeLeave = () => {
      onBeforeHide == null ? void 0 : onBeforeHide();
    };
    const onAfterShow = () => {
      onShow();
      stopHandle = core.onClickOutside(vue.computed(() => {
        var _a;
        return (_a = contentRef.value) == null ? void 0 : _a.popperContentRef;
      }), () => {
        if (vue.unref(controlled))
          return;
        const $trigger = vue.unref(trigger);
        if ($trigger !== "hover") {
          onClose();
        }
      });
    };
    const onBlur = () => {
      if (!props.virtualTriggering) {
        onClose();
      }
    };
    let stopHandle;
    vue.watch(() => vue.unref(open), (val) => {
      if (!val) {
        stopHandle == null ? void 0 : stopHandle();
      }
    }, {
      flush: "post"
    });
    vue.watch(() => props.content, () => {
      var _a, _b;
      (_b = (_a = contentRef.value) == null ? void 0 : _a.updatePopper) == null ? void 0 : _b.call(_a);
    });
    expose({
      contentRef
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Teleport, {
        disabled: !_ctx.teleported,
        to: vue.unref(appendTo)
      }, [
        vue.createVNode(vue.Transition, {
          name: vue.unref(transitionClass),
          onAfterLeave: onTransitionLeave,
          onBeforeEnter,
          onAfterEnter: onAfterShow,
          onBeforeLeave
        }, {
          default: vue.withCtx(() => [
            vue.unref(shouldRender) ? vue.withDirectives((vue.openBlock(), vue.createBlock(vue.unref(content$1["default"]), vue.mergeProps({
              key: 0,
              id: vue.unref(id),
              ref_key: "contentRef",
              ref: contentRef
            }, _ctx.$attrs, {
              "aria-label": _ctx.ariaLabel,
              "aria-hidden": vue.unref(ariaHidden),
              "boundaries-padding": _ctx.boundariesPadding,
              "fallback-placements": _ctx.fallbackPlacements,
              "gpu-acceleration": _ctx.gpuAcceleration,
              offset: _ctx.offset,
              placement: _ctx.placement,
              "popper-options": _ctx.popperOptions,
              strategy: _ctx.strategy,
              effect: _ctx.effect,
              enterable: _ctx.enterable,
              pure: _ctx.pure,
              "popper-class": _ctx.popperClass,
              "popper-style": [_ctx.popperStyle, vue.unref(contentStyle)],
              "reference-el": _ctx.referenceEl,
              "trigger-target-el": _ctx.triggerTargetEl,
              visible: vue.unref(shouldShow),
              "z-index": _ctx.zIndex,
              onMouseenter: vue.unref(onContentEnter),
              onMouseleave: vue.unref(onContentLeave),
              onBlur,
              onClose: vue.unref(onClose)
            }), {
              default: vue.withCtx(() => [
                !destroyed.value ? vue.renderSlot(_ctx.$slots, "default", { key: 0 }) : vue.createCommentVNode("v-if", true)
              ]),
              _: 3
            }, 16, ["id", "aria-label", "aria-hidden", "boundaries-padding", "fallback-placements", "gpu-acceleration", "offset", "placement", "popper-options", "strategy", "effect", "enterable", "pure", "popper-class", "popper-style", "reference-el", "trigger-target-el", "visible", "z-index", "onMouseenter", "onMouseleave", "onClose"])), [
              [vue.vShow, vue.unref(shouldShow)]
            ]) : vue.createCommentVNode("v-if", true)
          ]),
          _: 3
        }, 8, ["name"])
      ], 8, ["disabled", "to"]);
    };
  }
});
var ElTooltipContent = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip/src/content.vue"]]);

exports["default"] = ElTooltipContent;
//# sourceMappingURL=content2.js.map
