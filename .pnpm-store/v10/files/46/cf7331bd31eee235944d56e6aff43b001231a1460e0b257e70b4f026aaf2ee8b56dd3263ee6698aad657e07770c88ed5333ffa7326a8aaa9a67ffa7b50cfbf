const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Stepper/StepperRoot.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = {
	"aria-live": "polite",
	"aria-atomic": "true",
	role: "status",
	style: {
		transform: "translateX(-100%)",
		position: "absolute",
		pointerEvents: "none",
		opacity: 0,
		margin: 0
	}
};
const [injectStepperRootContext, provideStepperRootContext] = require_shared_createContext.createContext("StepperRoot");
var StepperRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "StepperRoot",
	props: {
		defaultValue: {
			type: Number,
			required: false,
			default: 1
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false
		},
		modelValue: {
			type: Number,
			required: false
		},
		linear: {
			type: Boolean,
			required: false,
			default: true
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
	emits: ["update:modelValue"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { dir: propDir, orientation: propOrientation, linear } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const totalStepperItems = (0, vue.ref)(/* @__PURE__ */ new Set());
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const totalStepperItemsArray = (0, vue.computed)(() => Array.from(totalStepperItems.value));
		const isFirstStep = (0, vue.computed)(() => modelValue.value === 1);
		const isLastStep = (0, vue.computed)(() => modelValue.value === totalStepperItemsArray.value.length);
		const totalSteps = (0, vue.computed)(() => totalStepperItems.value.size);
		function goToStep(step) {
			if (step > totalSteps.value) return;
			if (step < 1) return;
			if (totalStepperItems.value.size && !!totalStepperItemsArray.value[step] && !!totalStepperItemsArray.value[step].getAttribute("disabled")) return;
			if (linear.value) {
				if (step > (modelValue.value ?? 1) + 1) return;
			}
			modelValue.value = step;
		}
		function nextStep() {
			goToStep((modelValue.value ?? 1) + 1);
		}
		function prevStep() {
			goToStep((modelValue.value ?? 1) - 1);
		}
		function hasNext() {
			return (modelValue.value ?? 1) < totalSteps.value;
		}
		function hasPrev() {
			return (modelValue.value ?? 1) > 1;
		}
		const nextStepperItem = (0, vue.ref)(null);
		const prevStepperItem = (0, vue.ref)(null);
		const isNextDisabled = (0, vue.computed)(() => nextStepperItem.value ? nextStepperItem.value.getAttribute("disabled") === "" : true);
		const isPrevDisabled = (0, vue.computed)(() => prevStepperItem.value ? prevStepperItem.value.getAttribute("disabled") === "" : true);
		(0, vue.watch)(modelValue, async () => {
			await (0, vue.nextTick)(() => {
				nextStepperItem.value = totalStepperItemsArray.value.length && modelValue.value < totalStepperItemsArray.value.length ? totalStepperItemsArray.value[modelValue.value] : null;
				prevStepperItem.value = totalStepperItemsArray.value.length && modelValue.value > 1 ? totalStepperItemsArray.value[modelValue.value - 2] : null;
			});
		});
		(0, vue.watch)(totalStepperItemsArray, async () => {
			await (0, vue.nextTick)(() => {
				nextStepperItem.value = totalStepperItemsArray.value.length && modelValue.value < totalStepperItemsArray.value.length ? totalStepperItemsArray.value[modelValue.value] : null;
				prevStepperItem.value = totalStepperItemsArray.value.length && modelValue.value > 1 ? totalStepperItemsArray.value[modelValue.value - 2] : null;
			});
		});
		provideStepperRootContext({
			modelValue,
			changeModelValue: (value) => {
				modelValue.value = value;
			},
			orientation: propOrientation,
			dir,
			linear,
			totalStepperItems
		});
		__expose({
			goToStep,
			nextStep,
			prevStep,
			modelValue,
			totalSteps,
			isNextDisabled,
			isPrevDisabled,
			isFirstStep,
			isLastStep,
			hasNext,
			hasPrev
		});
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				role: "group",
				"aria-label": "progress",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-linear": (0, vue.unref)(linear) ? "" : void 0,
				"data-orientation": _ctx.orientation
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					totalSteps: totalStepperItems.value.size,
					isNextDisabled: isNextDisabled.value,
					isPrevDisabled: isPrevDisabled.value,
					isFirstStep: isFirstStep.value,
					isLastStep: isLastStep.value,
					goToStep,
					nextStep,
					prevStep,
					hasNext,
					hasPrev
				}), (0, vue.createElementVNode)("div", _hoisted_1, " Step " + (0, vue.toDisplayString)((0, vue.unref)(modelValue)) + " of " + (0, vue.toDisplayString)(totalStepperItems.value.size), 1)]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-linear",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/Stepper/StepperRoot.vue
var StepperRoot_default = StepperRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'StepperRoot_default', {
  enumerable: true,
  get: function () {
    return StepperRoot_default;
  }
});
Object.defineProperty(exports, 'injectStepperRootContext', {
  enumerable: true,
  get: function () {
    return injectStepperRootContext;
  }
});
//# sourceMappingURL=StepperRoot.cjs.map