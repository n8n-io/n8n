import { Primitive } from "../Primitive/Primitive.js";
import { injectRangeCalendarRootContext } from "./RangeCalendarRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RangeCalendar/RangeCalendarNext.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarNext",
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
		const disabled = computed(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage));
		const rootContext = injectRangeCalendarRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "Next page",
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => unref(rootContext).nextPage(props.nextPage))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = createTextVNode(" Next page "))])]),
				_: 3
			}, 16, [
				"type",
				"aria-disabled",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/RangeCalendar/RangeCalendarNext.vue
var RangeCalendarNext_default = RangeCalendarNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarNext_default };
//# sourceMappingURL=RangeCalendarNext.js.map