import { defineComponent, inject, ref, provide, onMounted, watch, unref, onBeforeUnmount, openBlock, createElementBlock, mergeProps, createVNode, withCtx, renderSlot } from 'vue';
import { NOOP } from '@vue/shared';
import { isNil } from 'lodash-unified';
import '../../focus-trap/index.mjs';
import '../../form/index.mjs';
import '../../../utils/index.mjs';
import { POPPER_CONTENT_INJECTION_KEY } from './constants.mjs';
import { popperContentProps, popperContentEmits } from './content.mjs';
import './composables/index.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { usePopperContentFocusTrap } from './composables/use-focus-trap.mjs';
import { usePopperContent } from './composables/use-content.mjs';
import { usePopperContentDOM } from './composables/use-content-dom.mjs';
import { formItemContextKey } from '../../form/src/constants.mjs';
import { isElement } from '../../../utils/types.mjs';
import ElFocusTrap from '../../focus-trap/src/focus-trap.mjs';

const __default__ = defineComponent({
  name: "ElPopperContent"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: popperContentProps,
  emits: popperContentEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const {
      focusStartRef,
      trapped,
      onFocusAfterReleased,
      onFocusAfterTrapped,
      onFocusInTrap,
      onFocusoutPrevented,
      onReleaseRequested
    } = usePopperContentFocusTrap(props, emit);
    const { attributes, arrowRef, contentRef, styles, instanceRef, role, update } = usePopperContent(props);
    const {
      ariaModal,
      arrowStyle,
      contentAttrs,
      contentClass,
      contentStyle,
      updateZIndex
    } = usePopperContentDOM(props, {
      styles,
      attributes,
      role
    });
    const formItemContext = inject(formItemContextKey, void 0);
    const arrowOffset = ref();
    provide(POPPER_CONTENT_INJECTION_KEY, {
      arrowStyle,
      arrowRef,
      arrowOffset
    });
    if (formItemContext && (formItemContext.addInputId || formItemContext.removeInputId)) {
      provide(formItemContextKey, {
        ...formItemContext,
        addInputId: NOOP,
        removeInputId: NOOP
      });
    }
    let triggerTargetAriaStopWatch = void 0;
    const updatePopper = (shouldUpdateZIndex = true) => {
      update();
      shouldUpdateZIndex && updateZIndex();
    };
    const togglePopperAlive = () => {
      updatePopper(false);
      if (props.visible && props.focusOnShow) {
        trapped.value = true;
      } else if (props.visible === false) {
        trapped.value = false;
      }
    };
    onMounted(() => {
      watch(() => props.triggerTargetEl, (triggerTargetEl, prevTriggerTargetEl) => {
        triggerTargetAriaStopWatch == null ? void 0 : triggerTargetAriaStopWatch();
        triggerTargetAriaStopWatch = void 0;
        const el = unref(triggerTargetEl || contentRef.value);
        const prevEl = unref(prevTriggerTargetEl || contentRef.value);
        if (isElement(el)) {
          triggerTargetAriaStopWatch = watch([role, () => props.ariaLabel, ariaModal, () => props.id], (watches) => {
            ;
            ["role", "aria-label", "aria-modal", "id"].forEach((key, idx) => {
              isNil(watches[idx]) ? el.removeAttribute(key) : el.setAttribute(key, watches[idx]);
            });
          }, { immediate: true });
        }
        if (prevEl !== el && isElement(prevEl)) {
          ;
          ["role", "aria-label", "aria-modal", "id"].forEach((key) => {
            prevEl.removeAttribute(key);
          });
        }
      }, { immediate: true });
      watch(() => props.visible, togglePopperAlive, { immediate: true });
    });
    onBeforeUnmount(() => {
      triggerTargetAriaStopWatch == null ? void 0 : triggerTargetAriaStopWatch();
      triggerTargetAriaStopWatch = void 0;
    });
    expose({
      popperContentRef: contentRef,
      popperInstanceRef: instanceRef,
      updatePopper,
      contentStyle
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", mergeProps({
        ref_key: "contentRef",
        ref: contentRef
      }, unref(contentAttrs), {
        style: unref(contentStyle),
        class: unref(contentClass),
        tabindex: "-1",
        onMouseenter: _cache[0] || (_cache[0] = (e) => _ctx.$emit("mouseenter", e)),
        onMouseleave: _cache[1] || (_cache[1] = (e) => _ctx.$emit("mouseleave", e))
      }), [
        createVNode(unref(ElFocusTrap), {
          trapped: unref(trapped),
          "trap-on-focus-in": true,
          "focus-trap-el": unref(contentRef),
          "focus-start-el": unref(focusStartRef),
          onFocusAfterTrapped: unref(onFocusAfterTrapped),
          onFocusAfterReleased: unref(onFocusAfterReleased),
          onFocusin: unref(onFocusInTrap),
          onFocusoutPrevented: unref(onFocusoutPrevented),
          onReleaseRequested: unref(onReleaseRequested)
        }, {
          default: withCtx(() => [
            renderSlot(_ctx.$slots, "default")
          ]),
          _: 3
        }, 8, ["trapped", "focus-trap-el", "focus-start-el", "onFocusAfterTrapped", "onFocusAfterReleased", "onFocusin", "onFocusoutPrevented", "onReleaseRequested"])
      ], 16);
    };
  }
});
var ElPopperContent = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/popper/src/content.vue"]]);

export { ElPopperContent as default };
//# sourceMappingURL=content2.mjs.map
