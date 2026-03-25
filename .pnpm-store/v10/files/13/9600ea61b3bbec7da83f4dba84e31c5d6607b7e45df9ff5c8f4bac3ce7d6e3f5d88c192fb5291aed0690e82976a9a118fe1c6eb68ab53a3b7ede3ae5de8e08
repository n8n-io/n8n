import { CalendarRoot_default } from "../Calendar/CalendarRoot.js";
import { injectDatePickerRootContext } from "./DatePickerRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { isEqualDay } from "@internationalized/date";

//#region src/DatePicker/DatePickerCalendar.vue?vue&type=script&setup=true&lang.ts
var DatePickerCalendar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DatePickerCalendar",
	setup(__props) {
		const rootContext = injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CalendarRoot_default), mergeProps({
				isDateDisabled: unref(rootContext).isDateDisabled,
				isDateUnavailable: unref(rootContext).isDateUnavailable,
				minValue: unref(rootContext).minValue.value,
				maxValue: unref(rootContext).maxValue.value,
				locale: unref(rootContext).locale.value,
				disabled: unref(rootContext).disabled.value,
				pagedNavigation: unref(rootContext).pagedNavigation.value,
				weekStartsOn: unref(rootContext).weekStartsOn.value,
				weekdayFormat: unref(rootContext).weekdayFormat.value,
				fixedWeeks: unref(rootContext).fixedWeeks.value,
				numberOfMonths: unref(rootContext).numberOfMonths.value,
				readonly: unref(rootContext).readonly.value,
				preventDeselect: unref(rootContext).preventDeselect.value,
				dir: unref(rootContext).dir.value
			}, {
				"model-value": unref(rootContext).modelValue.value,
				placeholder: unref(rootContext).placeholder.value,
				multiple: false,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (date) => {
					if (date && unref(rootContext).modelValue.value && unref(isEqualDay)(date, unref(rootContext).modelValue.value)) return;
					unref(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
					if (unref(isEqualDay)(date, unref(rootContext).placeholder.value)) return;
					unref(rootContext).onPlaceholderChange(date);
				})
			}), {
				default: withCtx(({ weekDays, grid, date, weekStartsOn, locale, fixedWeeks }) => [renderSlot(_ctx.$slots, "default", {
					date,
					grid,
					weekDays,
					weekStartsOn,
					locale,
					fixedWeeks
				})]),
				_: 3
			}, 16, ["model-value", "placeholder"]);
		};
	}
});

//#endregion
//#region src/DatePicker/DatePickerCalendar.vue
var DatePickerCalendar_default = DatePickerCalendar_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DatePickerCalendar_default };
//# sourceMappingURL=DatePickerCalendar.js.map