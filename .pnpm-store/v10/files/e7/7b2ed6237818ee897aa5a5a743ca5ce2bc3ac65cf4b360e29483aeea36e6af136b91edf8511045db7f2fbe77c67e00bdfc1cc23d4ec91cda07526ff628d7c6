import { Primitive } from "../Primitive/Primitive.js";
import { injectMonthRangePickerRootContext } from "./MonthRangePickerRoot.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/MonthRangePicker/MonthRangePickerHeading.vue?vue&type=script&setup=true&lang.ts
var MonthRangePickerHeading_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthRangePickerHeading",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectMonthRangePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				id: unref(rootContext).headingId,
				role: "heading",
				"aria-level": "2",
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { headingValue: unref(rootContext).headingValue.value }, () => [createTextVNode(toDisplayString(unref(rootContext).headingValue.value), 1)])]),
				_: 3
			}, 16, ["id", "data-disabled"]);
		};
	}
});

//#endregion
//#region src/MonthRangePicker/MonthRangePickerHeading.vue
var MonthRangePickerHeading_default = MonthRangePickerHeading_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthRangePickerHeading_default };
//# sourceMappingURL=MonthRangePickerHeading.js.map