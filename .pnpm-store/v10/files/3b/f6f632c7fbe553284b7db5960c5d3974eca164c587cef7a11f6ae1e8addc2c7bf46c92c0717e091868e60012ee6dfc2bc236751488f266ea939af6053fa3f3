import { Primitive } from "../Primitive/Primitive.js";
import { injectYearRangePickerRootContext } from "./YearRangePickerRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/YearRangePicker/YearRangePickerPrev.vue?vue&type=script&setup=true&lang.ts
var YearRangePickerPrev_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearRangePickerPrev",
	props: {
		prevPage: {
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
		const rootContext = injectYearRangePickerRootContext();
		const disabled = computed(() => rootContext.disabled.value || rootContext.isPrevButtonDisabled(props.prevPage));
		function handleClick() {
			if (disabled.value) return;
			rootContext.prevPage(props.prevPage);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				"aria-label": "Previous page",
				as: props.as,
				"as-child": props.asChild,
				type: props.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: handleClick
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[0] || (_cache[0] = createTextVNode(" Prev page "))])]),
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
//#region src/YearRangePicker/YearRangePickerPrev.vue
var YearRangePickerPrev_default = YearRangePickerPrev_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearRangePickerPrev_default };
//# sourceMappingURL=YearRangePickerPrev.js.map