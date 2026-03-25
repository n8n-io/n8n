import { defineComponent, ref, computed, unref, watch, onMounted, onBeforeUnmount, provide, renderSlot } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { TOOLTIP_V2_OPEN, tooltipV2RootKey } from './constants.mjs';
import { tooltipV2RootProps } from './root.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { isPropAbsent, isNumber } from '../../../utils/types.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useId } from '../../../hooks/use-id/index.mjs';

const __default__ = defineComponent({
  name: "ElTooltipV2Root"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: tooltipV2RootProps,
  setup(__props, { expose }) {
    const props = __props;
    const _open = ref(props.defaultOpen);
    const triggerRef = ref(null);
    const open = computed({
      get: () => isPropAbsent(props.open) ? _open.value : props.open,
      set: (open2) => {
        var _a;
        _open.value = open2;
        (_a = props["onUpdate:open"]) == null ? void 0 : _a.call(props, open2);
      }
    });
    const isOpenDelayed = computed(() => isNumber(props.delayDuration) && props.delayDuration > 0);
    const { start: onDelayedOpen, stop: clearTimer } = useTimeoutFn(() => {
      open.value = true;
    }, computed(() => props.delayDuration), {
      immediate: false
    });
    const ns = useNamespace("tooltip-v2");
    const contentId = useId();
    const onNormalOpen = () => {
      clearTimer();
      open.value = true;
    };
    const onDelayOpen = () => {
      unref(isOpenDelayed) ? onDelayedOpen() : onNormalOpen();
    };
    const onOpen = onNormalOpen;
    const onClose = () => {
      clearTimer();
      open.value = false;
    };
    const onChange = (open2) => {
      var _a;
      if (open2) {
        document.dispatchEvent(new CustomEvent(TOOLTIP_V2_OPEN));
        onOpen();
      }
      (_a = props.onOpenChange) == null ? void 0 : _a.call(props, open2);
    };
    watch(open, onChange);
    onMounted(() => {
      document.addEventListener(TOOLTIP_V2_OPEN, onClose);
    });
    onBeforeUnmount(() => {
      clearTimer();
      document.removeEventListener(TOOLTIP_V2_OPEN, onClose);
    });
    provide(tooltipV2RootKey, {
      contentId,
      triggerRef,
      ns,
      onClose,
      onDelayOpen,
      onOpen
    });
    expose({
      onOpen,
      onClose
    });
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default", { open: unref(open) });
    };
  }
});
var TooltipV2Root = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/root.vue"]]);

export { TooltipV2Root as default };
//# sourceMappingURL=root2.mjs.map
