import { Primitive } from "../Primitive/Primitive.js";
import { injectYearRangePickerRootContext } from "./YearRangePickerRoot.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/YearRangePicker/YearRangePickerHeading.vue?vue&type=script&setup=true&lang.ts
var YearRangePickerHeading_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearRangePickerHeading",
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
		const rootContext = injectYearRangePickerRootContext();
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
//#region src/YearRangePicker/YearRangePickerHeading.vue
var YearRangePickerHeading_default = YearRangePickerHeading_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearRangePickerHeading_default };
//# sourceMappingURL=YearRangePickerHeading.js.map