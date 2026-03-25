import { Primitive } from "../Primitive/Primitive.js";
import { injectCalendarRootContext } from "./CalendarRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Calendar/CalendarNext.vue?vue&type=script&setup=true&lang.ts
var CalendarNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CalendarNext",
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
		const rootContext = injectCalendarRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"aria-label": "Next page",
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => unref(rootContext).nextPage(props.nextPage))
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = createTextVNode(" Next page "))])]),
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
//#region src/Calendar/CalendarNext.vue
var CalendarNext_default = CalendarNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CalendarNext_default };
//# sourceMappingURL=CalendarNext.js.map