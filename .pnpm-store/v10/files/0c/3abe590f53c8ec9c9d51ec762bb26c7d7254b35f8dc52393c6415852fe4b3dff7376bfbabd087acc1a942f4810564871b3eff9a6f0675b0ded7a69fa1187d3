import { Primitive } from "../Primitive/Primitive.js";
import { injectRangeCalendarRootContext } from "./RangeCalendarRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RangeCalendar/RangeCalendarCell.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarCell_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarCell",
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
		const rootContext = injectRangeCalendarRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "gridcell",
				"aria-selected": unref(rootContext).isSelected(_ctx.date) ? true : void 0,
				"aria-disabled": unref(rootContext).isDateDisabled(_ctx.date) || unref(rootContext).isDateUnavailable?.(_ctx.date) || unref(rootContext).disableDaysOutsideCurrentView.value,
				"data-disabled": unref(rootContext).isDateDisabled(_ctx.date) || unref(rootContext).disableDaysOutsideCurrentView.value ? "" : void 0
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
//#region src/RangeCalendar/RangeCalendarCell.vue
var RangeCalendarCell_default = RangeCalendarCell_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarCell_default };
//# sourceMappingURL=RangeCalendarCell.js.map