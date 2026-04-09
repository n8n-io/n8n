import { Primitive } from "../Primitive/Primitive.js";
import { injectYearPickerRootContext } from "./YearPickerRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/YearPicker/YearPickerCell.vue?vue&type=script&setup=true&lang.ts
var YearPickerCell_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearPickerCell",
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
		const rootContext = injectYearPickerRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "gridcell",
				"aria-selected": unref(rootContext).isYearSelected(_ctx.date) ? true : void 0,
				"aria-disabled": unref(rootContext).isYearDisabled(_ctx.date) || unref(rootContext).isYearUnavailable?.(_ctx.date),
				"data-disabled": unref(rootContext).isYearDisabled(_ctx.date) ? "" : void 0
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
//#region src/YearPicker/YearPickerCell.vue
var YearPickerCell_default = YearPickerCell_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearPickerCell_default };
//# sourceMappingURL=YearPickerCell.js.map