const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useKbd = require('../shared/useKbd.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Stepper_StepperRoot = require('./StepperRoot.cjs');
const require_Stepper_StepperItem = require('./StepperItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Stepper/StepperTrigger.vue?vue&type=script&setup=true&lang.ts
var StepperTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Stepper_StepperRoot.injectStepperRootContext();
		const itemContext = require_Stepper_StepperItem.injectStepperItemContext();
		const kbd = require_shared_useKbd.useKbd();
		const stepperItems = (0, vue.computed)(() => Array.from(rootContext.totalStepperItems.value));
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
			].includes(event.key)) require_shared_useArrowNavigation.useArrowNavigation(event, require_shared_getActiveElement.getActiveElement(), void 0, {
				itemsArray: stepperItems.value,
				focus: true,
				loop: false,
				arrowKeyOptions: rootContext.orientation.value,
				dir: rootContext.dir.value
			});
		}
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		(0, vue.onMounted)(() => {
			rootContext.totalStepperItems.value.add(currentElement.value);
		});
		(0, vue.onUnmounted)(() => {
			rootContext.totalStepperItems.value.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": (0, vue.unref)(itemContext).state.value,
				disabled: (0, vue.unref)(itemContext).disabled.value || !(0, vue.unref)(itemContext).isFocusable.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(itemContext).disabled.value || !(0, vue.unref)(itemContext).isFocusable.value ? "" : void 0,
				"data-orientation": (0, vue.unref)(rootContext).orientation.value,
				tabindex: (0, vue.unref)(itemContext).isFocusable.value ? 0 : -1,
				"aria-describedby": (0, vue.unref)(itemContext).descriptionId,
				"aria-labelledby": (0, vue.unref)(itemContext).titleId,
				onMousedown: (0, vue.withModifiers)(handleMouseDown, ["left"]),
				onKeydown: (0, vue.withKeys)(handleKeyDown, [
					"enter",
					"space",
					"left",
					"right",
					"up",
					"down"
				])
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'StepperTrigger_default', {
  enumerable: true,
  get: function () {
    return StepperTrigger_default;
  }
});
//# sourceMappingURL=StepperTrigger.cjs.map