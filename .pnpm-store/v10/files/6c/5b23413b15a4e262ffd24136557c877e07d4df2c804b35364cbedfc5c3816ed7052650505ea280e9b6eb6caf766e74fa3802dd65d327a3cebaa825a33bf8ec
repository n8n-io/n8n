import { Primitive } from "../Primitive/Primitive.js";
import { injectCalendarRootContext } from "./CalendarRoot.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/Calendar/CalendarHeading.vue?vue&type=script&setup=true&lang.ts
var CalendarHeading_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CalendarHeading",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectCalendarRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { "data-disabled": unref(rootContext).disabled.value ? "" : void 0 }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { headingValue: unref(rootContext).headingValue.value }, () => [createTextVNode(toDisplayString(unref(rootContext).headingValue.value), 1)])]),
				_: 3
			}, 16, ["data-disabled"]);
		};
	}
});

//#endregion
//#region src/Calendar/CalendarHeading.vue
var CalendarHeading_default = CalendarHeading_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CalendarHeading_default };
//# sourceMappingURL=CalendarHeading.js.map