import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Separator_default } from "../Separator/Separator.js";
import { injectStepperRootContext } from "./StepperRoot.js";
import { injectStepperItemContext } from "./StepperItem.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Stepper/StepperSeparator.vue?vue&type=script&setup=true&lang.ts
var StepperSeparator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperSeparator",
	props: {
		orientation: {
			type: String,
			required: false
		},
		decorative: {
			type: Boolean,
			required: false
		},
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
		const rootContext = injectStepperRootContext();
		const itemContext = injectStepperItemContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Separator_default), mergeProps(props, {
				decorative: "",
				orientation: unref(rootContext).orientation.value,
				"data-state": unref(itemContext).state.value
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["orientation", "data-state"]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperSeparator.vue
var StepperSeparator_default = StepperSeparator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperSeparator_default };
//# sourceMappingURL=StepperSeparator.js.map