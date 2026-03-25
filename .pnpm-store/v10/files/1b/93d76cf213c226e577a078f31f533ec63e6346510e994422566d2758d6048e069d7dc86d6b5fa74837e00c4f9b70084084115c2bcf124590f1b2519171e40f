import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectStepperItemContext } from "./StepperItem.js";
import { createBlock, createTextVNode, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/Stepper/StepperIndicator.vue?vue&type=script&setup=true&lang.ts
var StepperIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperIndicator",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const itemContext = injectStepperItemContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { step: unref(itemContext).step.value }, () => [createTextVNode(" Step " + toDisplayString(unref(itemContext).step.value), 1)])]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Stepper/StepperIndicator.vue
var StepperIndicator_default = StepperIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperIndicator_default };
//# sourceMappingURL=StepperIndicator.js.map