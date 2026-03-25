import { defineComponent, ref, nextTick, onMounted, computed, provide, reactive, toRefs, watch, openBlock, createElementBlock, unref, normalizeClass, renderSlot } from 'vue';
import '../../form/index.mjs';
import '../../../constants/index.mjs';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { radioGroupProps, radioGroupEmits } from './radio-group.mjs';
import { radioGroupKey } from './constants.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { useId } from '../../../hooks/use-id/index.mjs';
import { useFormItem, useFormItemInputId } from '../../form/src/hooks/use-form-item.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';
import { debugWarn } from '../../../utils/error.mjs';

const _hoisted_1 = ["id", "aria-label", "aria-labelledby"];
const __default__ = defineComponent({
  name: "ElRadioGroup"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: radioGroupProps,
  emits: radioGroupEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = useNamespace("radio");
    const radioId = useId();
    const radioGroupRef = ref();
    const { formItem } = useFormItem();
    const { inputId: groupId, isLabeledByFormItem } = useFormItemInputId(props, {
      formItemContext: formItem
    });
    const changeEvent = (value) => {
      emit(UPDATE_MODEL_EVENT, value);
      nextTick(() => emit("change", value));
    };
    onMounted(() => {
      const radios = radioGroupRef.value.querySelectorAll("[type=radio]");
      const firstLabel = radios[0];
      if (!Array.from(radios).some((radio) => radio.checked) && firstLabel) {
        firstLabel.tabIndex = 0;
      }
    });
    const name = computed(() => {
      return props.name || radioId.value;
    });
    provide(radioGroupKey, reactive({
      ...toRefs(props),
      changeEvent,
      name
    }));
    watch(() => props.modelValue, () => {
      if (props.validateEvent) {
        formItem == null ? void 0 : formItem.validate("change").catch((err) => debugWarn(err));
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        id: unref(groupId),
        ref_key: "radioGroupRef",
        ref: radioGroupRef,
        class: normalizeClass(unref(ns).b("group")),
        role: "radiogroup",
        "aria-label": !unref(isLabeledByFormItem) ? _ctx.label || "radio-group" : void 0,
        "aria-labelledby": unref(isLabeledByFormItem) ? unref(formItem).labelId : void 0
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 10, _hoisted_1);
    };
  }
});
var RadioGroup = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/radio/src/radio-group.vue"]]);

export { RadioGroup as default };
//# sourceMappingURL=radio-group2.mjs.map
