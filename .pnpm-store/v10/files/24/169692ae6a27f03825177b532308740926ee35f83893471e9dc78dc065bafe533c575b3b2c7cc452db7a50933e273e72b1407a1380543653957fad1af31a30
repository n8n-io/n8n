import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectStepperItemContext } from "./StepperItem.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Stepper/StepperTitle.vue?vue&type=script&setup=true&lang.ts
var StepperTitle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperTitle",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "h4"
		}
	},
	setup(__props) {
		const props = __props;
		const itemContext = injectStepperItemContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(itemContext).titleId }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperTitle.vue
var StepperTitle_default = StepperTitle_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperTitle_default };
//# sourceMappingURL=StepperTitle.js.map