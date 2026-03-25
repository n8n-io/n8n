const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_DateField_DateFieldRoot = require('../DateField/DateFieldRoot.cjs');
const require_DatePicker_DatePickerRoot = require('./DatePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DatePicker/DatePickerField.vue?vue&type=script&setup=true&lang.ts
var DatePickerField_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DatePickerField",
	setup(__props) {
		const rootContext = require_DatePicker_DatePickerRoot.injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DateField_DateFieldRoot.DateFieldRoot_default), (0, vue.mergeProps)({
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
					if (date && (0, vue.unref)(rootContext).modelValue.value && date.compare((0, vue.unref)(rootContext).modelValue.value) === 0) return;
					(0, vue.unref)(rootContext).onDateChange(date);
				}),
				"onUpdate:placeholder": _cache[1] || (_cache[1] = (date) => {
					if (date.compare((0, vue.unref)(rootContext).placeholder.value) === 0) return;
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
//#region src/DatePicker/DatePickerField.vue
var DatePickerField_default = DatePickerField_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DatePickerField_default', {
  enumerable: true,
  get: function () {
    return DatePickerField_default;
  }
});
//# sourceMappingURL=DatePickerField.cjs.map