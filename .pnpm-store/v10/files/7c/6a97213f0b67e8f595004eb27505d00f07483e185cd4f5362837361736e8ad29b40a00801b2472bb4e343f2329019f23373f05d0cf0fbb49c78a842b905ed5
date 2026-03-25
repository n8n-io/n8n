const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_DateRangeField_DateRangeFieldRoot = require('../DateRangeField/DateRangeFieldRoot.cjs');
const require_DateRangePicker_DateRangePickerRoot = require('./DateRangePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __internationalized_date = require_rolldown_runtime.__toESM(require("@internationalized/date"));

//#region src/DateRangePicker/DateRangePickerField.vue?vue&type=script&setup=true&lang.ts
var DateRangePickerField_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DateRangePickerField",
	setup(__props) {
		const rootContext = require_DateRangePicker_DateRangePickerRoot.injectDateRangePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DateRangeField_DateRangeFieldRoot.DateRangeFieldRoot_default), (0, vue.mergeProps)({
				ref: (0, vue.unref)(rootContext).dateFieldRef,
				"model-value": (0, vue.unref)(rootContext).modelValue.value,
				placeholder: (0, vue.unref)(rootContext).placeholder.value
			}, {
				id: (0, vue.unref)(rootContext).id.value,
				name: (0, vue.unref)(rootContext).name.value,
				disabled: (0, vue.unref)(rootContext).disabled.value,
				minValue: (0, vue.unref)(rootContext).minValue.value,
				maxValue: (0, vue.unref)(rootContext).maxValue.value,
				readonly: (0, vue.unref)(rootContext).readonly.value,
				hourCycle: (0, vue.unref)(rootContext).hourCycle.value,
				granularity: (0, vue.unref)(rootContext).granularity.value,
				hideTimeZone: (0, vue.unref)(rootContext).hideTimeZone.value,
				locale: (0, vue.unref)(rootContext).locale.value,
				isDateUnavailable: (0, vue.unref)(rootContext).isDateUnavailable,
				required: (0, vue.unref)(rootContext).required.value,
				dir: (0, vue.unref)(rootContext).dir.value,
				step: (0, vue.unref)(rootContext).step.value
			}, {
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (date) => {
					if (date.start && (0, vue.unref)(rootContext).modelValue.value.start && date.end && (0, vue.unref)(rootContext).modelValue.value.end && date.start.compare((0, vue.unref)(rootContext).modelValue.value.start) === 0 && date.end.compare((0, vue.unref)(rootContext).modelValue.value.end) === 0) return;
					(0, vue.unref)(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
					if ((0, vue.unref)(__internationalized_date.isEqualDay)(date, (0, vue.unref)(rootContext).placeholder.value) && date.compare((0, vue.unref)(rootContext).placeholder.value) === 0) return;
					(0, vue.unref)(rootContext).onPlaceholderChange(date);
				})
			}), {
				default: (0, vue.withCtx)(({ segments, modelValue }) => [(0, vue.renderSlot)(_ctx.$slots, "default", {
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
Object.defineProperty(exports, 'DateRangePickerField_default', {
  enumerable: true,
  get: function () {
    return DateRangePickerField_default;
  }
});
//# sourceMappingURL=DateRangePickerField.cjs.map