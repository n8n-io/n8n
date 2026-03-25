import { Primitive } from "../Primitive/Primitive.js";
import { injectRangeCalendarRootContext } from "./RangeCalendarRoot.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RangeCalendar/RangeCalendarGrid.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarGrid_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarGrid",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "table"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectRangeCalendarRootContext();
		const disabled = computed(() => rootContext.disabled.value ? true : void 0);
		const readonly = computed(() => rootContext.readonly.value ? true : void 0);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				tabindex: "-1",
				role: "grid",
				"aria-readonly": readonly.value,
				"aria-disabled": disabled.value,
				"data-readonly": readonly.value && "",
				"data-disabled": disabled.value && ""
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-readonly",
				"aria-disabled",
				"data-readonly",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/RangeCalendar/RangeCalendarGrid.vue
var RangeCalendarGrid_default = RangeCalendarGrid_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarGrid_default };
//# sourceMappingURL=RangeCalendarGrid.js.map