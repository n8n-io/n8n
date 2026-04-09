import { Primitive } from "../Primitive/Primitive.js";
import { injectMonthRangePickerRootContext } from "./MonthRangePickerRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/MonthRangePicker/MonthRangePickerNext.vue?vue&type=script&setup=true&lang.ts
var MonthRangePickerNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthRangePickerNext",
	props: {
		nextPage: {
			type: Function,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectMonthRangePickerRootContext();
		const disabled = computed(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage));
		function handleClick() {
			if (disabled.value) return;
			rootContext.nextPage(props.nextPage);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"aria-label": "Next year",
				type: props.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: handleClick
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[0] || (_cache[0] = createTextVNode(" Next year "))])]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"type",
				"aria-disabled",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/MonthRangePicker/MonthRangePickerNext.vue
var MonthRangePickerNext_default = MonthRangePickerNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthRangePickerNext_default };
//# sourceMappingURL=MonthRangePickerNext.js.map