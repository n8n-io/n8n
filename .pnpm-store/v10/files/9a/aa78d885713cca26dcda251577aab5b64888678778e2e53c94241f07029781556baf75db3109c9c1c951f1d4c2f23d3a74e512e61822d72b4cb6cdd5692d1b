import { DateRangeFieldRoot_default } from "../DateRangeField/DateRangeFieldRoot.js";
import { injectDateRangePickerRootContext } from "./DateRangePickerRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { isEqualDay } from "@internationalized/date";

//#region src/DateRangePicker/DateRangePickerField.vue?vue&type=script&setup=true&lang.ts
var DateRangePickerField_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DateRangePickerField",
	setup(__props) {
		const rootContext = injectDateRangePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DateRangeFieldRoot_default), mergeProps({
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
					if (date.start && unref(rootContext).modelValue.value.start && date.end && unref(rootContext).modelValue.value.end && date.start.compare(unref(rootContext).modelValue.value.start) === 0 && date.end.compare(unref(rootContext).modelValue.value.end) === 0) return;
					unref(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
					if (unref(isEqualDay)(date, unref(rootContext).placeholder.value) && date.compare(unref(rootContext).placeholder.value) === 0) return;
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
//#region src/DateRangePicker/DateRangePickerField.vue
var DateRangePickerField_default = DateRangePickerField_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DateRangePickerField_default };
//# sourceMappingURL=DateRangePickerField.js.map