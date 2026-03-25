import { injectDatePickerRootContext } from "./DatePickerRoot.js";
import { PopoverTrigger_default } from "../Popover/PopoverTrigger.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/DatePicker/DatePickerTrigger.vue?vue&type=script&setup=true&lang.ts
var DatePickerTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectDatePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopoverTrigger_default), mergeProps({ "data-reka-date-field-segment": "trigger" }, props, {
				disabled: unref(rootContext).disabled.value,
				onFocusin: _cache[0] || (_cache[0] = (e) => {
					unref(rootContext).dateFieldRef.value?.setFocusedElement(e.target);
				})
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["disabled"]);
		};
	}
});

//#endregion
//#region src/DatePicker/DatePickerTrigger.vue
var DatePickerTrigger_default = DatePickerTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DatePickerTrigger_default };
//# sourceMappingURL=DatePickerTrigger.js.map