import { Primitive } from "../Primitive/Primitive.js";
import { injectMonthPickerRootContext } from "./MonthPickerRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/MonthPicker/MonthPickerNext.vue?vue&type=script&setup=true&lang.ts
var MonthPickerNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MonthPickerNext",
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
		const rootContext = injectMonthPickerRootContext();
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
//#region src/MonthPicker/MonthPickerNext.vue
var MonthPickerNext_default = MonthPickerNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MonthPickerNext_default };
//# sourceMappingURL=MonthPickerNext.js.map