import { Primitive } from "../Primitive/Primitive.js";
import { injectRangeCalendarRootContext } from "./RangeCalendarRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RangeCalendar/RangeCalendarPrev.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarPrev_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RangeCalendarPrev",
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
		const disabled = computed(() => rootContext.disabled.value || rootContext.isPrevButtonDisabled(props.prevPage));
		const rootContext = injectRangeCalendarRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "Previous page",
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => unref(rootContext).prevPage(props.prevPage))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = createTextVNode(" Prev page "))])]),
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
//#region src/RangeCalendar/RangeCalendarPrev.vue
var RangeCalendarPrev_default = RangeCalendarPrev_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RangeCalendarPrev_default };
//# sourceMappingURL=RangeCalendarPrev.js.map