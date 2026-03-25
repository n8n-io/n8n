import { defineComponent, useSlots, computed, ref, provide, openBlock, createBlock, Teleport, createVNode, Transition, unref, withCtx, withDirectives, createElementVNode, normalizeClass, normalizeStyle, mergeProps, createSlots, renderSlot, createCommentVNode, vShow } from 'vue';
import { ElOverlay } from '../../overlay/index.mjs';
import '../../../hooks/index.mjs';
import '../../focus-trap/index.mjs';
import ElDialogContent from './dialog-content2.mjs';
import { dialogInjectionKey } from './constants.mjs';
import { dialogProps, dialogEmits } from './dialog.mjs';
import { useDialog } from './use-dialog.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useDeprecated } from '../../../hooks/use-deprecated/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useSameTarget } from '../../../hooks/use-same-target/index.mjs';
import ElFocusTrap from '../../focus-trap/src/focus-trap.mjs';

const _hoisted_1 = ["aria-label", "aria-labelledby", "aria-describedby"];
const __default__ = defineComponent({
  name: "ElDialog",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: dialogProps,
  emits: dialogEmits,
  setup(__props, { expose }) {
    const props = __props;
    const slots = useSlots();
    useDeprecated({
      scope: "el-dialog",
      from: "the title slot",
      replacement: "the header slot",
      version: "3.0.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#slots"
    }, computed(() => !!slots.title));
    useDeprecated({
      scope: "el-dialog",
      from: "custom-class",
      replacement: "class",
      version: "2.3.0",
      ref: "https://element-plus.org/en-US/component/dialog.html#attributes",
      type: "Attribute"
    }, computed(() => !!props.customClass));
    const ns = useNamespace("dialog");
    const dialogRef = ref();
    const headerRef = ref();
    const dialogContentRef = ref();
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
    } = useDialog(props, dialogRef);
    provide(dialogInjectionKey, {
      dialogRef,
      headerRef,
      bodyId,
      ns,
      rendered,
      style
    });
    const overlayEvent = useSameTarget(onModalClick);
    const draggable = computed(() => props.draggable && !props.fullscreen);
    expose({
      visible,
      dialogContentRef
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Teleport, {
        to: _ctx.appendTo,
        disabled: _ctx.appendTo !== "body" ? false : !_ctx.appendToBody
      }, [
        createVNode(Transition, {
          name: "dialog-fade",
          onAfterEnter: unref(afterEnter),
          onAfterLeave: unref(afterLeave),
          onBeforeLeave: unref(beforeLeave),
          persisted: ""
        }, {
          default: withCtx(() => [
            withDirectives(createVNode(unref(ElOverlay), {
              "custom-mask-event": "",
              mask: _ctx.modal,
              "overlay-class": _ctx.modalClass,
              "z-index": unref(zIndex)
            }, {
              default: withCtx(() => [
                createElementVNode("div", {
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-label": _ctx.title || void 0,
                  "aria-labelledby": !_ctx.title ? unref(titleId) : void 0,
                  "aria-describedby": unref(bodyId),
                  class: normalizeClass(`${unref(ns).namespace.value}-overlay-dialog`),
                  style: normalizeStyle(unref(overlayDialogStyle)),
                  onClick: _cache[0] || (_cache[0] = (...args) => unref(overlayEvent).onClick && unref(overlayEvent).onClick(...args)),
                  onMousedown: _cache[1] || (_cache[1] = (...args) => unref(overlayEvent).onMousedown && unref(overlayEvent).onMousedown(...args)),
                  onMouseup: _cache[2] || (_cache[2] = (...args) => unref(overlayEvent).onMouseup && unref(overlayEvent).onMouseup(...args))
                }, [
                  createVNode(unref(ElFocusTrap), {
                    loop: "",
                    trapped: unref(visible),
                    "focus-start-el": "container",
                    onFocusAfterTrapped: unref(onOpenAutoFocus),
                    onFocusAfterReleased: unref(onCloseAutoFocus),
                    onFocusoutPrevented: unref(onFocusoutPrevented),
                    onReleaseRequested: unref(onCloseRequested)
                  }, {
                    default: withCtx(() => [
                      unref(rendered) ? (openBlock(), createBlock(ElDialogContent, mergeProps({
                        key: 0,
                        ref_key: "dialogContentRef",
                        ref: dialogContentRef
                      }, _ctx.$attrs, {
                        "custom-class": _ctx.customClass,
                        center: _ctx.center,
                        "align-center": _ctx.alignCenter,
                        "close-icon": _ctx.closeIcon,
                        draggable: unref(draggable),
                        fullscreen: _ctx.fullscreen,
                        "show-close": _ctx.showClose,
                        title: _ctx.title,
                        "aria-level": _ctx.headerAriaLevel,
                        onClose: unref(handleClose)
                      }), createSlots({
                        header: withCtx(() => [
                          !_ctx.$slots.title ? renderSlot(_ctx.$slots, "header", {
                            key: 0,
                            close: unref(handleClose),
                            titleId: unref(titleId),
                            titleClass: unref(ns).e("title")
                          }) : renderSlot(_ctx.$slots, "title", { key: 1 })
                        ]),
                        default: withCtx(() => [
                          renderSlot(_ctx.$slots, "default")
                        ]),
                        _: 2
                      }, [
                        _ctx.$slots.footer ? {
                          name: "footer",
                          fn: withCtx(() => [
                            renderSlot(_ctx.$slots, "footer")
                          ])
                        } : void 0
                      ]), 1040, ["custom-class", "center", "align-center", "close-icon", "draggable", "fullscreen", "show-close", "title", "aria-level", "onClose"])) : createCommentVNode("v-if", true)
                    ]),
                    _: 3
                  }, 8, ["trapped", "onFocusAfterTrapped", "onFocusAfterReleased", "onFocusoutPrevented", "onReleaseRequested"])
                ], 46, _hoisted_1)
              ]),
              _: 3
            }, 8, ["mask", "overlay-class", "z-index"]), [
              [vShow, unref(visible)]
            ])
          ]),
          _: 3
        }, 8, ["onAfterEnter", "onAfterLeave", "onBeforeLeave"])
      ], 8, ["to", "disabled"]);
    };
  }
});
var Dialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/dialog/src/dialog.vue"]]);

export { Dialog as default };
//# sourceMappingURL=dialog2.mjs.map
