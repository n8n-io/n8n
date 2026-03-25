const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Calendar_CalendarRoot = require('../Calendar/CalendarRoot.cjs');
const require_DatePicker_DatePickerRoot = require('./DatePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/DatePicker/DatePickerCalendar.vue?vue&type=script&setup=true&lang.ts
var DatePickerCalendar_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DatePickerCalendar",
	setup(__props) {
		const rootContext = require_DatePicker_DatePickerRoot.injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Calendar_CalendarRoot.CalendarRoot_default), (0, vue.mergeProps)({
				isDateDisabled: (0, vue.unref)(rootContext).isDateDisabled,
				isDateUnavailable: (0, vue.unref)(rootContext).isDateUnavailable,
				minValue: (0, vue.unref)(rootContext).minValue.value,
				maxValue: (0, vue.unref)(rootContext).maxValue.value,
				locale: (0, vue.unref)(rootContext).locale.value,
				disabled: (0, vue.unref)(rootContext).disabled.value,
				pagedNavigation: (0, vue.unref)(rootContext).pagedNavigation.value,
				weekStartsOn: (0, vue.unref)(rootContext).weekStartsOn.value,
				weekdayFormat: (0, vue.unref)(rootContext).weekdayFormat.value,
				fixedWeeks: (0, vue.unref)(rootContext).fixedWeeks.value,
				numberOfMonths: (0, vue.unref)(rootContext).numberOfMonths.value,
				readonly: (0, vue.unref)(rootContext).readonly.value,
				preventDeselect: (0, vue.unref)(rootContext).preventDeselect.value,
				dir: (0, vue.unref)(rootContext).dir.value
			}, {
				"model-value": (0, vue.unref)(rootContext).modelValue.value,
				placeholder: (0, vue.unref)(rootContext).placeholder.value,
				multiple: false,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (date) => {
					if (date && (0, vue.unref)(rootContext).modelValue.value && (0, vue.unref)(__internationalized_date.isEqualDay)(date, (0, vue.unref)(rootContext).modelValue.value)) return;
					(0, vue.unref)(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
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
//#region src/DatePicker/DatePickerCalendar.vue
var DatePickerCalendar_default = DatePickerCalendar_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DatePickerCalendar_default', {
  enumerable: true,
  get: function () {
    return DatePickerCalendar_default;
  }
});
//# sourceMappingURL=DatePickerCalendar.cjs.map