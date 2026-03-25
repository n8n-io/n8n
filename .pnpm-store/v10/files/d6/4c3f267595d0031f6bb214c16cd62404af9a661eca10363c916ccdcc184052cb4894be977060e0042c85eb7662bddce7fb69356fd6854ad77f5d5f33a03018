import { defineComponent, getCurrentInstance, watch, provide, openBlock, createElementBlock, normalizeClass, unref, renderSlot } from 'vue';
import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import { stepsProps, stepsEmits } from './steps.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useOrderedChildren } from '../../../hooks/use-ordered-children/index.mjs';
import { CHANGE_EVENT } from '../../../constants/event.mjs';

const __default__ = defineComponent({
  name: "ElSteps"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: stepsProps,
  emits: stepsEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = useNamespace("steps");
    const {
      children: steps,
      addChild: addStep,
      removeChild: removeStep
    } = useOrderedChildren(getCurrentInstance(), "ElStep");
    watch(steps, () => {
      steps.value.forEach((instance, index) => {
        instance.setIndex(index);
      });
    });
    provide("ElSteps", { props, steps, addStep, removeStep });
    watch(() => props.active, (newVal, oldVal) => {
      emit(CHANGE_EVENT, newVal, oldVal);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass([unref(ns).b(), unref(ns).m(_ctx.simple ? "simple" : _ctx.direction)])
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 2);
    };
  }
});
var Steps = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/steps/src/steps.vue"]]);

export { Steps as default };
//# sourceMappingURL=steps2.mjs.map
