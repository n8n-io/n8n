import { getActiveElement } from "../shared/getActiveElement.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useKbd } from "../shared/useKbd.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectStepperRootContext } from "./StepperRoot.js";
import { injectStepperItemContext } from "./StepperItem.js";
import { computed, createBlock, defineComponent, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx, withKeys, withModifiers } from "vue";

//#region src/Stepper/StepperTrigger.vue?vue&type=script&setup=true&lang.ts
var StepperTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "StepperTrigger",
	props: {
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
		const rootContext = injectStepperRootContext();
		const itemContext = injectStepperItemContext();
		const kbd = useKbd();
		const stepperItems = computed(() => Array.from(rootContext.totalStepperItems.value));
		function handleMouseDown(event) {
			if (itemContext.disabled.value) return;
			if (rootContext.linear.value) {
				if (itemContext.step.value <= rootContext.modelValue.value || itemContext.step.value === rootContext.modelValue.value + 1) {
					if (event.ctrlKey === false) {
						rootContext.changeModelValue(itemContext.step.value);
						return;
					}
				}
			} else if (event.ctrlKey === false) {
				rootContext.changeModelValue(itemContext.step.value);
				return;
			}
			event.preventDefault();
		}
		function handleKeyDown(event) {
			event.preventDefault();
			if (itemContext.disabled.value) return;
			if ((event.key === kbd.ENTER || event.key === kbd.SPACE) && !event.ctrlKey && !event.shiftKey) rootContext.changeModelValue(itemContext.step.value);
			if ([
				kbd.ARROW_LEFT,
				kbd.ARROW_RIGHT,
				kbd.ARROW_UP,
				kbd.ARROW_DOWN
			].includes(event.key)) useArrowNavigation(event, getActiveElement(), void 0, {
				itemsArray: stepperItems.value,
				focus: true,
				loop: false,
				arrowKeyOptions: rootContext.orientation.value,
				dir: rootContext.dir.value
			});
		}
		const { forwardRef, currentElement } = useForwardExpose();
		onMounted(() => {
			rootContext.totalStepperItems.value.add(currentElement.value);
		});
		onUnmounted(() => {
			rootContext.totalStepperItems.value.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": unref(itemContext).state.value,
				disabled: unref(itemContext).disabled.value || !unref(itemContext).isFocusable.value ? "" : void 0,
				"data-disabled": unref(itemContext).disabled.value || !unref(itemContext).isFocusable.value ? "" : void 0,
				"data-orientation": unref(rootContext).orientation.value,
				tabindex: unref(itemContext).isFocusable.value ? 0 : -1,
				"aria-describedby": unref(itemContext).descriptionId,
				"aria-labelledby": unref(itemContext).titleId,
				onMousedown: withModifiers(handleMouseDown, ["left"]),
				onKeydown: withKeys(handleKeyDown, [
					"enter",
					"space",
					"left",
					"right",
					"up",
					"down"
				])
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"type",
				"as",
				"as-child",
				"data-state",
				"disabled",
				"data-disabled",
				"data-orientation",
				"tabindex",
				"aria-describedby",
				"aria-labelledby"
			]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperTrigger.vue
var StepperTrigger_default = StepperTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { StepperTrigger_default };
//# sourceMappingURL=StepperTrigger.js.map