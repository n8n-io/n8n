import { defineComponent, ref, computed, provide, renderSlot } from 'vue';
import { POPPER_INJECTION_KEY } from './constants.mjs';
import { popperProps } from './popper.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const __default__ = defineComponent({
  name: "ElPopper",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: popperProps,
  setup(__props, { expose }) {
    const props = __props;
    const triggerRef = ref();
    const popperInstanceRef = ref();
    const contentRef = ref();
    const referenceRef = ref();
    const role = computed(() => props.role);
    const popperProvides = {
      triggerRef,
      popperInstanceRef,
      contentRef,
      referenceRef,
      role
    };
    expose(popperProvides);
    provide(POPPER_INJECTION_KEY, popperProvides);
    return (_ctx, _cache) => {
      return renderSlot(_ctx.$slots, "default");
    };
  }
});
var Popper = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/popper/src/popper.vue"]]);

export { Popper as default };
//# sourceMappingURL=popper2.mjs.map
