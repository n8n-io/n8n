import { defineComponent, inject, watch, onBeforeUnmount, openBlock, createBlock, unref, withCtx, renderSlot, createElementBlock, mergeProps } from 'vue';
import '../../../utils/index.mjs';
import { tooltipV2RootKey } from './constants.mjs';
import ForwardRef from './forward-ref.mjs';
import { tooltipV2TriggerProps } from './trigger.mjs';
import { tooltipV2CommonProps } from './common.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { composeEventHandlers } from '../../../utils/dom/event.mjs';

const __default__ = defineComponent({
  name: "ElTooltipV2Trigger"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: {
    ...tooltipV2CommonProps,
    ...tooltipV2TriggerProps
  },
  setup(__props) {
    const props = __props;
    const { onClose, onOpen, onDelayOpen, triggerRef, contentId } = inject(tooltipV2RootKey);
    let isMousedown = false;
    const setTriggerRef = (el) => {
      triggerRef.value = el;
    };
    const onMouseup = () => {
      isMousedown = false;
    };
    const onMouseenter = composeEventHandlers(props.onMouseEnter, onDelayOpen);
    const onMouseleave = composeEventHandlers(props.onMouseLeave, onClose);
    const onMousedown = composeEventHandlers(props.onMouseDown, () => {
      onClose();
      isMousedown = true;
      document.addEventListener("mouseup", onMouseup, { once: true });
    });
    const onFocus = composeEventHandlers(props.onFocus, () => {
      if (!isMousedown)
        onOpen();
    });
    const onBlur = composeEventHandlers(props.onBlur, onClose);
    const onClick = composeEventHandlers(props.onClick, (e) => {
      if (e.detail === 0)
        onClose();
    });
    const events = {
      blur: onBlur,
      click: onClick,
      focus: onFocus,
      mousedown: onMousedown,
      mouseenter: onMouseenter,
      mouseleave: onMouseleave
    };
    const setEvents = (el, events2, type) => {
      if (el) {
        Object.entries(events2).forEach(([name, handler]) => {
          el[type](name, handler);
        });
      }
    };
    watch(triggerRef, (triggerEl, previousTriggerEl) => {
      setEvents(triggerEl, events, "addEventListener");
      setEvents(previousTriggerEl, events, "removeEventListener");
      if (triggerEl) {
        triggerEl.setAttribute("aria-describedby", contentId.value);
      }
    });
    onBeforeUnmount(() => {
      setEvents(triggerRef.value, events, "removeEventListener");
      document.removeEventListener("mouseup", onMouseup);
    });
    return (_ctx, _cache) => {
      return _ctx.nowrap ? (openBlock(), createBlock(unref(ForwardRef), {
        key: 0,
        "set-ref": setTriggerRef,
        "only-child": ""
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      })) : (openBlock(), createElementBlock("button", mergeProps({
        key: 1,
        ref_key: "triggerRef",
        ref: triggerRef
      }, _ctx.$attrs), [
        renderSlot(_ctx.$slots, "default")
      ], 16));
    };
  }
});
var TooltipV2Trigger = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/trigger.vue"]]);

export { TooltipV2Trigger as default };
//# sourceMappingURL=trigger2.mjs.map
