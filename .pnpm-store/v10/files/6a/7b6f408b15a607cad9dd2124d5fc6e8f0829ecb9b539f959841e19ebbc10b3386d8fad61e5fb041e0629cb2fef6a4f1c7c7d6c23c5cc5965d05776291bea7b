import { Primitive } from "../Primitive/Primitive.js";
import { injectMonthPickerRootContext } from "./MonthPickerRoot.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/MonthPicker/MonthPickerHeading.vue?vue&type=script&setup=true&lang.ts
var MonthPickerHeading_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthPickerHeading",
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
		const rootContext = injectMonthPickerRootContext();
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
//#region src/MonthPicker/MonthPickerHeading.vue
var MonthPickerHeading_default = MonthPickerHeading_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthPickerHeading_default };
//# sourceMappingURL=MonthPickerHeading.js.map