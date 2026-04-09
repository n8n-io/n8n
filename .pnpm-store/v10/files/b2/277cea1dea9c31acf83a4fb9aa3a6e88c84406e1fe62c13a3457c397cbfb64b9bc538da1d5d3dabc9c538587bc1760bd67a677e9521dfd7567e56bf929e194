import { Primitive } from "../Primitive/Primitive.js";
import { injectMonthRangePickerRootContext } from "./MonthRangePickerRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/MonthRangePicker/MonthRangePickerCell.vue?vue&type=script&setup=true&lang.ts
var MonthRangePickerCell_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthRangePickerCell",
	props: {
		date: {
			type: null,
			required: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "td"
		}
	},
	setup(__props) {
		const rootContext = injectMonthRangePickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "gridcell",
				"aria-selected": unref(rootContext).isSelected(_ctx.date) ? true : void 0,
				"aria-disabled": unref(rootContext).isMonthDisabled(_ctx.date) || unref(rootContext).isMonthUnavailable?.(_ctx.date),
				"data-disabled": unref(rootContext).isMonthDisabled(_ctx.date) ? "" : void 0
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-selected",
				"aria-disabled",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/MonthRangePicker/MonthRangePickerCell.vue
var MonthRangePickerCell_default = MonthRangePickerCell_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthRangePickerCell_default };
//# sourceMappingURL=MonthRangePickerCell.js.map