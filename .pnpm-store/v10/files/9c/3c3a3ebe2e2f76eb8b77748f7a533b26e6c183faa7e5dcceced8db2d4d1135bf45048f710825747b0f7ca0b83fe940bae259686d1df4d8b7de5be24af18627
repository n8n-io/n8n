'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$3 = require('../../overlay/index.js');
require('../../../hooks/index.js');
require('../../focus-trap/index.js');
var dialogContent = require('./dialog-content2.js');
var constants = require('./constants.js');
var dialog = require('./dialog.js');
var useDialog = require('./use-dialog.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-deprecated/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var index$2 = require('../../../hooks/use-same-target/index.js');
var focusTrap = require('../../focus-trap/src/focus-trap.js');

const _hoisted_1 = ["aria-label", "aria-labelledby", "aria-describedby"];
const __default__ = vue.defineComponent({
  name: "ElDialog",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: dialog.dialogProps,
  emits: dialog.dialogEmits,
  setup(__props, { expose }) {
    const props = __props;
    const slots = vue.useSlots();
    index.useDeprecated({
      scope: "el-dialog",
      from: "the title slot",
      replacement: "the header slot",
      version: "3.0.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#slots"
    }, vue.computed(() => !!slots.title));
    index.useDeprecated({
      scope: "el-dialog",
      from: "custom-class",
      replacement: "class",
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#attributes",
      type: "Attribute"
    }, vue.computed(() => !!props.customClass));
    const ns = index$1.useNamespace("dialog");
    const dialogRef = vue.ref();
    const headerRef = vue.ref();
    const dialogContentRef = vue.ref();
    const {
      visible,
      titleId,
      bodyId,
      style,
      overlayDialogStyle,
      rendered,
      zIndex,
      afterEnter,
      afterLeave,
      beforeLeave,
      handleClose,
      onModalClick,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onCloseRequested,
      onFocusoutPrevented
    } = useDialog.useDialog(props, dialogRef);
    vue.provide(constants.dialogInjectionKey, {
      dialogRef,
      headerRef,
      bodyId,
      ns,
      rendered,
      style
    });
    const overlayEvent = index$2.useSameTarget(onModalClick);
    const draggable = vue.computed(() => props.draggable && !props.fullscreen);
    expose({
      visible,
      dialogContentRef
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Teleport, {
        to: _ctx.appendTo,
        disabled: _ctx.appendTo !== "body" ? false : !_ctx.appendToBody
      }, [
        vue.createVNode(vue.Transition, {
          name: "dialog-fade",
          onAfterEnter: vue.unref(afterEnter),
          onAfterLeave: vue.unref(afterLeave),
          onBeforeLeave: vue.unref(beforeLeave),
          persisted: ""
        }, {
          default: vue.withCtx(() => [
            vue.withDirectives(vue.createVNode(vue.unref(index$3.ElOverlay), {
              "custom-mask-event": "",
              mask: _ctx.modal,
              "overlay-class": _ctx.modalClass,
              "z-index": vue.unref(zIndex)
            }, {
              default: vue.withCtx(() => [
                vue.createElementVNode("div", {
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-label": _ctx.title || void 0,
                  "aria-labelledby": !_ctx.title ? vue.unref(titleId) : void 0,
                  "aria-describedby": vue.unref(bodyId),
                  class: vue.normalizeClass(`${vue.unref(ns).namespace.value}-overlay-dialog`),
                  style: vue.normalizeStyle(vue.unref(overlayDialogStyle)),
                  onClick: _cache[0] || (_cache[0] = (...args) => vue.unref(overlayEvent).onClick && vue.unref(overlayEvent).onClick(...args)),
                  onMousedown: _cache[1] || (_cache[1] = (...args) => vue.unref(overlayEvent).onMousedown && vue.unref(overlayEvent).onMousedown(...args)),
                  onMouseup: _cache[2] || (_cache[2] = (...args) => vue.unref(overlayEvent).onMouseup && vue.unref(overlayEvent).onMouseup(...args))
                }, [
                  vue.createVNode(vue.unref(focusTrap["default"]), {
                    loop: "",
                    trapped: vue.unref(visible),
                    "focus-start-el": "container",
                    onFocusAfterTrapped: vue.unref(onOpenAutoFocus),
                    onFocusAfterReleased: vue.unref(onCloseAutoFocus),
                    onFocusoutPrevented: vue.unref(onFocusoutPrevented),
                    onReleaseRequested: vue.unref(onCloseRequested)
                  }, {
                    default: vue.withCtx(() => [
                      vue.unref(rendered) ? (vue.openBlock(), vue.createBlock(dialogContent["default"], vue.mergeProps({
                        key: 0,
                        ref_key: "dialogContentRef",
                        ref: dialogContentRef
                      }, _ctx.$attrs, {
                        "custom-class": _ctx.customClass,
                        center: _ctx.center,
                        "align-center": _ctx.alignCenter,
                        "close-icon": _ctx.closeIcon,
                        draggable: vue.unref(draggable),
                        fullscreen: _ctx.fullscreen,
                        "show-close": _ctx.showClose,
                        title: _ctx.title,
                        "aria-level": _ctx.headerAriaLevel,
                        onClose: vue.unref(handleClose)
                      }), vue.createSlots({
                        header: vue.withCtx(() => [
                          !_ctx.$slots.title ? vue.renderSlot(_ctx.$slots, "header", {
                            key: 0,
                            close: vue.unref(handleClose),
                            titleId: vue.unref(titleId),
                            titleClass: vue.unref(ns).e("title")
                          }) : vue.renderSlot(_ctx.$slots, "title", { key: 1 })
                        ]),
                        default: vue.withCtx(() => [
                          vue.renderSlot(_ctx.$slots, "default")
                        ]),
                        _: 2
                      }, [
                        _ctx.$slots.footer ? {
                          name: "footer",
                          fn: vue.withCtx(() => [
                            vue.renderSlot(_ctx.$slots, "footer")
                          ])
                        } : void 0
                      ]), 1040, ["custom-class", "center", "align-center", "close-icon", "draggable", "fullscreen", "show-close", "title", "aria-level", "onClose"])) : vue.createCommentVNode("v-if", true)
                    ]),
                    _: 3
                  }, 8, ["trapped", "onFocusAfterTrapped", "onFocusAfterReleased", "onFocusoutPrevented", "onReleaseRequested"])
                ], 46, _hoisted_1)
              ]),
              _: 3
            }, 8, ["mask", "overlay-class", "z-index"]), [
              [vue.vShow, vue.unref(visible)]
            ])
          ]),
          _: 3
        }, 8, ["onAfterEnter", "onAfterLeave", "onBeforeLeave"])
      ], 8, ["to", "disabled"]);
    };
  }
});
var Dialog = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/dialog/src/dialog.vue"]]);

exports["default"] = Dialog;
//# sourceMappingURL=dialog2.js.map
