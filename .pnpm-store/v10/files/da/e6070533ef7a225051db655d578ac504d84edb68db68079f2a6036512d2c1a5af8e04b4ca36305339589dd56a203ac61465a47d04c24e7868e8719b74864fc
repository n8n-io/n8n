import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectStepperItemContext } from "./StepperItem.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Stepper/StepperDescription.vue?vue&type=script&setup=true&lang.ts
var StepperDescription_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperDescription",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "p"
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		const itemContext = injectStepperItemContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(itemContext).descriptionId }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperDescription.vue
var StepperDescription_default = StepperDescription_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperDescription_default };
//# sourceMappingURL=StepperDescription.js.map