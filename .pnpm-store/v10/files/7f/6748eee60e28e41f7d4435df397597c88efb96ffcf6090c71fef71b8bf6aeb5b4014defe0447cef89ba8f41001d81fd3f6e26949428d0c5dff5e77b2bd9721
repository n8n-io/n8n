const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_DatePicker_DatePickerRoot = require('./DatePickerRoot.cjs');
const require_Popover_PopoverTrigger = require('../Popover/PopoverTrigger.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DatePicker/DatePickerTrigger.vue?vue&type=script&setup=true&lang.ts
var DatePickerTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DatePickerTrigger",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_DatePicker_DatePickerRoot.injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popover_PopoverTrigger.PopoverTrigger_default), (0, vue.mergeProps)({ "data-reka-date-field-segment": "trigger" }, props, {
				disabled: (0, vue.unref)(rootContext).disabled.value,
				onFocusin: _cache[0] || (_cache[0] = (e) => {
					(0, vue.unref)(rootContext).dateFieldRef.value?.setFocusedElement(e.target);
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["disabled"]);
		};
	}
});

//#endregion
//#region src/DatePicker/DatePickerTrigger.vue
var DatePickerTrigger_default = DatePickerTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DatePickerTrigger_default', {
  enumerable: true,
  get: function () {
    return DatePickerTrigger_default;
  }
});
//# sourceMappingURL=DatePickerTrigger.cjs.map