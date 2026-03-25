import { DateFieldRoot_default } from "../DateField/DateFieldRoot.js";
import { injectDatePickerRootContext } from "./DatePickerRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/DatePicker/DatePickerField.vue?vue&type=script&setup=true&lang.ts
var DatePickerField_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DatePickerField",
	setup(__props) {
		const rootContext = injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DateFieldRoot_default), mergeProps({
				ref: unref(rootContext).dateFieldRef,
				"model-value": unref(rootContext).modelValue.value,
				placeholder: unref(rootContext).placeholder.value
			}, {
				id: unref(rootContext).id.value,
				name: unref(rootContext).name.value,
				disabled: unref(rootContext).disabled.value,
				minValue: unref(rootContext).minValue.value,
				maxValue: unref(rootContext).maxValue.value,
				readonly: unref(rootContext).readonly.value,
				hourCycle: unref(rootContext).hourCycle.value,
				granularity: unref(rootContext).granularity.value,
				hideTimeZone: unref(rootContext).hideTimeZone.value,
				locale: unref(rootContext).locale.value,
				isDateUnavailable: unref(rootContext).isDateUnavailable,
				required: unref(rootContext).required.value,
				dir: unref(rootContext).dir.value,
				step: unref(rootContext).step.value
			}, {
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (date) => {
					if (date && unref(rootContext).modelValue.value && date.compare(unref(rootContext).modelValue.value) === 0) return;
					unref(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
					if (date.compare(unref(rootContext).placeholder.value) === 0) return;
					unref(rootContext).onPlaceholderChange(date);
				})
			}), {
				default: withCtx(({ segments, modelValue }) => [renderSlot(_ctx.$slots, "default", {
					segments,
					modelValue
				})]),
				_: 3
			}, 16, ["model-value", "placeholder"]);
		};
	}
});

//#endregion
//#region src/DatePicker/DatePickerField.vue
var DatePickerField_default = DatePickerField_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DatePickerField_default };
//# sourceMappingURL=DatePickerField.js.map