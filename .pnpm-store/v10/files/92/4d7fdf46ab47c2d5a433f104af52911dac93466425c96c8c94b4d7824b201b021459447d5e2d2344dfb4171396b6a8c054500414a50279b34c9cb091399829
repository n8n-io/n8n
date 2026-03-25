const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Stepper_StepperRoot = require('./StepperRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Stepper/StepperItem.vue?vue&type=script&setup=true&lang.ts
const [injectStepperItemContext, provideStepperItemContext] = require_shared_createContext.createContext("StepperItem");
var StepperItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { disabled, step, completed } = (0, vue.toRefs)(props);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Stepper_StepperRoot.injectStepperRootContext();
		const titleId = require_shared_useId.useId(void 0, "reka-stepper-item-title");
		const descriptionId = require_shared_useId.useId(void 0, "reka-stepper-item-description");
		const itemState = (0, vue.computed)(() => {
			if (completed.value) return "completed";
			if (rootContext.modelValue.value === step.value) return "active";
			if (rootContext.modelValue.value > step.value) return "completed";
			return "inactive";
		});
		const isFocusable = (0, vue.computed)(() => {
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"aria-current": itemState.value === "active" ? "true" : void 0,
				"data-state": itemState.value,
				disabled: (0, vue.unref)(disabled) || !isFocusable.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(disabled) || !isFocusable.value ? "" : void 0,
				"data-orientation": (0, vue.unref)(rootContext).orientation.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { state: itemState.value })]),
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
Object.defineProperty(exports, 'StepperItem_default', {
  enumerable: true,
  get: function () {
    return StepperItem_default;
  }
});
Object.defineProperty(exports, 'injectStepperItemContext', {
  enumerable: true,
  get: function () {
    return injectStepperItemContext;
  }
});
//# sourceMappingURL=StepperItem.cjs.map