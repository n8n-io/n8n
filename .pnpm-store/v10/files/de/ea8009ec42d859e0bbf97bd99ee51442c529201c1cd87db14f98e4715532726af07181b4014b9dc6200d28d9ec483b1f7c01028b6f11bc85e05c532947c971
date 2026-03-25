import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectStepperRootContext } from "./StepperRoot.js";
import { computed, createBlock, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Stepper/StepperItem.vue?vue&type=script&setup=true&lang.ts
const [injectStepperItemContext, provideStepperItemContext] = createContext("StepperItem");
var StepperItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperItem",
	props: {
		step: {
			type: Number,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		completed: {
			type: Boolean,
			required: false,
			default: false
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
		const { disabled, step, completed } = toRefs(props);
		const { forwardRef } = useForwardExpose();
		const rootContext = injectStepperRootContext();
		const titleId = useId(void 0, "reka-stepper-item-title");
		const descriptionId = useId(void 0, "reka-stepper-item-description");
		const itemState = computed(() => {
			if (completed.value) return "completed";
			if (rootContext.modelValue.value === step.value) return "active";
			if (rootContext.modelValue.value > step.value) return "completed";
			return "inactive";
		});
		const isFocusable = computed(() => {
			if (disabled.value) return false;
			if (rootContext.linear.value) return step.value <= rootContext.modelValue.value || step.value === rootContext.modelValue.value + 1;
			return true;
		});
		provideStepperItemContext({
			titleId,
			descriptionId,
			state: itemState,
			disabled,
			step,
			isFocusable
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-current": itemState.value === "active" ? "true" : void 0,
				"data-state": itemState.value,
				disabled: unref(disabled) || !isFocusable.value ? "" : void 0,
				"data-disabled": unref(disabled) || !isFocusable.value ? "" : void 0,
				"data-orientation": unref(rootContext).orientation.value
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { state: itemState.value })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-current",
				"data-state",
				"disabled",
				"data-disabled",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperItem.vue
var StepperItem_default = StepperItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperItem_default, injectStepperItemContext };
//# sourceMappingURL=StepperItem.js.map