import { injectDateRangePickerRootContext } from "./DateRangePickerRoot.js";
import { RangeCalendarRoot_default } from "../RangeCalendar/RangeCalendarRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { isEqualDay } from "@internationalized/date";

//#region src/DateRangePicker/DateRangePickerCalendar.vue?vue&type=script&setup=true&lang.ts
var DateRangePickerCalendar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DateRangePickerCalendar",
	setup(__props) {
		const rootContext = injectDateRangePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RangeCalendarRoot_default), mergeProps({
				allowNonContiguousRanges: unref(rootContext).allowNonContiguousRanges.value,
				isDateDisabled: unref(rootContext).isDateDisabled,
				isDateUnavailable: unref(rootContext).isDateUnavailable,
				isDateHighlightable: unref(rootContext).isDateHighlightable,
				locale: unref(rootContext).locale.value,
				disabled: unref(rootContext).disabled.value,
				pagedNavigation: unref(rootContext).pagedNavigation.value,
				weekStartsOn: unref(rootContext).weekStartsOn.value,
				weekdayFormat: unref(rootContext).weekdayFormat.value,
				fixedWeeks: unref(rootContext).fixedWeeks.value,
				numberOfMonths: unref(rootContext).numberOfMonths.value,
				readonly: unref(rootContext).readonly.value,
				preventDeselect: unref(rootContext).preventDeselect.value,
				minValue: unref(rootContext).minValue.value,
				maxValue: unref(rootContext).maxValue.value,
				dir: unref(rootContext).dir.value,
				fixedDate: unref(rootContext).fixedDate.value,
				maximumDays: unref(rootContext).maximumDays?.value
			}, {
				"model-value": unref(rootContext).modelValue.value,
				placeholder: unref(rootContext).placeholder.value,
				"onUpdate:startValue": _cache[0] || (_cache[0] = (date) => {
					unref(rootContext).onStartValueChange(date);
				}),
				"onUpdate:modelValue": _cache[1] || (_cache[1] = (date) => {
					if (date.start && unref(rootContext).modelValue.value?.start && date.end && unref(rootContext).modelValue.value?.end && unref(isEqualDay)(date.start, unref(rootContext).modelValue.value?.start) && unref(isEqualDay)(date.end, unref(rootContext).modelValue.value?.end)) return;
					unref(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[2] || (_cache[2] = (date) => {
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
//#region src/DateRangePicker/DateRangePickerCalendar.vue
var DateRangePickerCalendar_default = DateRangePickerCalendar_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DateRangePickerCalendar_default };
//# sourceMappingURL=DateRangePickerCalendar.js.map