'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var constants = require('./constants.js');
var root = require('./root.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var types = require('../../../utils/types.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-id/index.js');

const __default__ = vue.defineComponent({
  name: "ElTooltipV2Root"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: root.tooltipV2RootProps,
  setup(__props, { expose }) {
    const props = __props;
    const _open = vue.ref(props.defaultOpen);
    const triggerRef = vue.ref(null);
    const open = vue.computed({
      get: () => types.isPropAbsent(props.open) ? _open.value : props.open,
      set: (open2) => {
        var _a;
        _open.value = open2;
        (_a = props["onUpdate:open"]) == null ? void 0 : _a.call(props, open2);
      }
    });
    const isOpenDelayed = vue.computed(() => types.isNumber(props.delayDuration) && props.delayDuration > 0);
    const { start: onDelayedOpen, stop: clearTimer } = core.useTimeoutFn(() => {
      open.value = true;
    }, vue.computed(() => props.delayDuration), {
      immediate: false
    });
    const ns = index.useNamespace("tooltip-v2");
    const contentId = index$1.useId();
    const onNormalOpen = () => {
      clearTimer();
      open.value = true;
    };
    const onDelayOpen = () => {
      vue.unref(isOpenDelayed) ? onDelayedOpen() : onNormalOpen();
    };
    const onOpen = onNormalOpen;
    const onClose = () => {
      clearTimer();
      open.value = false;
    };
    const onChange = (open2) => {
      var _a;
      if (open2) {
        document.dispatchEvent(new CustomEvent(constants.TOOLTIP_V2_OPEN));
        onOpen();
      }
      (_a = props.onOpenChange) == null ? void 0 : _a.call(props, open2);
    };
    vue.watch(open, onChange);
    vue.onMounted(() => {
      document.addEventListener(constants.TOOLTIP_V2_OPEN, onClose);
    });
    vue.onBeforeUnmount(() => {
      clearTimer();
      document.removeEventListener(constants.TOOLTIP_V2_OPEN, onClose);
    });
    vue.provide(constants.tooltipV2RootKey, {
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
      return vue.renderSlot(_ctx.$slots, "default", { open: vue.unref(open) });
    };
  }
});
var TooltipV2Root = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tooltip-v2/src/root.vue"]]);

exports["default"] = TooltipV2Root;
//# sourceMappingURL=root2.js.map
