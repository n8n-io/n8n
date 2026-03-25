const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_DateRangePicker_DateRangePickerRoot = require('./DateRangePickerRoot.cjs');
const require_RangeCalendar_RangeCalendarRoot = require('../RangeCalendar/RangeCalendarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/DateRangePicker/DateRangePickerCalendar.vue?vue&type=script&setup=true&lang.ts
var DateRangePickerCalendar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DateRangePickerCalendar",
	setup(__props) {
		const rootContext = require_DateRangePicker_DateRangePickerRoot.injectDateRangePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RangeCalendar_RangeCalendarRoot.RangeCalendarRoot_default), (0, vue.mergeProps)({
				allowNonContiguousRanges: (0, vue.unref)(rootContext).allowNonContiguousRanges.value,
				isDateDisabled: (0, vue.unref)(rootContext).isDateDisabled,
				isDateUnavailable: (0, vue.unref)(rootContext).isDateUnavailable,
				isDateHighlightable: (0, vue.unref)(rootContext).isDateHighlightable,
				locale: (0, vue.unref)(rootContext).locale.value,
				disabled: (0, vue.unref)(rootContext).disabled.value,
				pagedNavigation: (0, vue.unref)(rootContext).pagedNavigation.value,
				weekStartsOn: (0, vue.unref)(rootContext).weekStartsOn.value,
				weekdayFormat: (0, vue.unref)(rootContext).weekdayFormat.value,
				fixedWeeks: (0, vue.unref)(rootContext).fixedWeeks.value,
				numberOfMonths: (0, vue.unref)(rootContext).numberOfMonths.value,
				readonly: (0, vue.unref)(rootContext).readonly.value,
				preventDeselect: (0, vue.unref)(rootContext).preventDeselect.value,
				minValue: (0, vue.unref)(rootContext).minValue.value,
				maxValue: (0, vue.unref)(rootContext).maxValue.value,
				dir: (0, vue.unref)(rootContext).dir.value,
				fixedDate: (0, vue.unref)(rootContext).fixedDate.value,
				maximumDays: (0, vue.unref)(rootContext).maximumDays?.value
			}, {
				"model-value": (0, vue.unref)(rootContext).modelValue.value,
				placeholder: (0, vue.unref)(rootContext).placeholder.value,
				"onUpdate:startValue": _cache[0] || (_cache[0] = (date) => {
					(0, vue.unref)(rootContext).onStartValueChange(date);
				}),
				"onUpdate:modelValue": _cache[1] || (_cache[1] = (date) => {
					if (date.start && (0, vue.unref)(rootContext).modelValue.value?.start && date.end && (0, vue.unref)(rootContext).modelValue.value?.end && (0, vue.unref)(__internationalized_date.isEqualDay)(date.start, (0, vue.unref)(rootContext).modelValue.value?.start) && (0, vue.unref)(__internationalized_date.isEqualDay)(date.end, (0, vue.unref)(rootContext).modelValue.value?.end)) return;
					(0, vue.unref)(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[2] || (_cache[2] = (date) => {
					if ((0, vue.unref)(__internationalized_date.isEqualDay)(date, (0, vue.unref)(rootContext).placeholder.value)) return;
					(0, vue.unref)(rootContext).onPlaceholderChange(date);
				})
			}), {
				default: (0, vue.withCtx)(({ weekDays, grid, date, weekStartsOn, locale, fixedWeeks }) => [(0, vue.renderSlot)(_ctx.$slots, "default", {
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
Object.defineProperty(exports, 'DateRangePickerCalendar_default', {
  enumerable: true,
  get: function () {
    return DateRangePickerCalendar_default;
  }
});
//# sourceMappingURL=DateRangePickerCalendar.cjs.map