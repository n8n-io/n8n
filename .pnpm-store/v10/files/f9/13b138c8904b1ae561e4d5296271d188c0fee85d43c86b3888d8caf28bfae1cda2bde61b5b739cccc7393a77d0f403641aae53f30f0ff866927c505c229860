const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_nullish = require('../shared/nullish.cjs');
const require_shared_isValueEqualOrExist = require('../shared/isValueEqualOrExist.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_Checkbox_CheckboxGroupRoot = require('./CheckboxGroupRoot.cjs');
const require_Checkbox_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const ohash = require_rolldown_runtime.__toESM(require("ohash"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Checkbox/CheckboxRoot.vue?vue&type=script&setup=true&lang.ts
const [injectCheckboxRootContext, provideCheckboxRootContext] = require_shared_createContext.createContext("CheckboxRoot");
var CheckboxRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "CheckboxRoot",
	props: {
		defaultValue: {
			type: [Boolean, String],
			required: false
		},
		modelValue: {
			type: [
				Boolean,
				String,
				null
			],
			required: false,
			default: void 0
		},
		disabled: {
			type: Boolean,
			required: false
		},
		value: {
			type: null,
			required: false,
			default: "on"
		},
		id: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const checkboxGroupContext = require_Checkbox_CheckboxGroupRoot.injectCheckboxGroupRootContext(null);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const disabled = (0, vue.computed)(() => checkboxGroupContext?.disabled.value || props.disabled);
		const checkboxState = (0, vue.computed)(() => {
			if (!require_shared_nullish.isNullish(checkboxGroupContext?.modelValue.value)) return require_shared_isValueEqualOrExist.isValueEqualOrExist(checkboxGroupContext.modelValue.value, props.value);
			else return modelValue.value === "indeterminate" ? "indeterminate" : modelValue.value;
		});
		function handleClick() {
			if (!require_shared_nullish.isNullish(checkboxGroupContext?.modelValue.value)) {
				const modelValueArray = [...checkboxGroupContext.modelValue.value || []];
				if (require_shared_isValueEqualOrExist.isValueEqualOrExist(modelValueArray, props.value)) {
					const index = modelValueArray.findIndex((i) => (0, ohash.isEqual)(i, props.value));
					modelValueArray.splice(index, 1);
				} else modelValueArray.push(props.value);
				checkboxGroupContext.modelValue.value = modelValueArray;
			} else modelValue.value = require_Checkbox_utils.isIndeterminate(modelValue.value) ? true : !modelValue.value;
		}
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const ariaLabel = (0, vue.computed)(() => props.id && currentElement.value ? document.querySelector(`[for="${props.id}"]`)?.innerText : void 0);
		provideCheckboxRootContext({
			disabled,
			state: checkboxState
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(checkboxGroupContext)?.rovingFocus.value ? (0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default) : (0, vue.unref)(require_Primitive_Primitive.Primitive)), (0, vue.mergeProps)(_ctx.$attrs, {
				id: _ctx.id,
				ref: (0, vue.unref)(forwardRef),
				role: "checkbox",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-checked": (0, vue.unref)(require_Checkbox_utils.isIndeterminate)(checkboxState.value) ? "mixed" : checkboxState.value,
				"aria-required": _ctx.required,
				"aria-label": _ctx.$attrs["aria-label"] || ariaLabel.value,
				"data-state": (0, vue.unref)(require_Checkbox_utils.getState)(checkboxState.value),
				"data-disabled": disabled.value ? "" : void 0,
				disabled: disabled.value,
				focusable: (0, vue.unref)(checkboxGroupContext)?.rovingFocus.value ? !disabled.value : void 0,
				onKeydown: (0, vue.withKeys)((0, vue.withModifiers)(() => {}, ["prevent"]), ["enter"]),
				onClick: handleClick
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					state: checkboxState.value
				}), (0, vue.unref)(isFormControl) && _ctx.name && !(0, vue.unref)(checkboxGroupContext) ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "checkbox",
					checked: !!checkboxState.value,
					name: _ctx.name,
					value: _ctx.value,
					disabled: disabled.value,
					required: _ctx.required
				}, null, 8, [
					"checked",
					"name",
					"value",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, [
				"id",
				"as-child",
				"as",
				"type",
				"aria-checked",
				"aria-required",
				"aria-label",
				"data-state",
				"data-disabled",
				"disabled",
				"focusable",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Checkbox/CheckboxRoot.vue
var CheckboxRoot_default = CheckboxRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CheckboxRoot_default', {
  enumerable: true,
  get: function () {
    return CheckboxRoot_default;
  }
});
Object.defineProperty(exports, 'injectCheckboxRootContext', {
  enumerable: true,
  get: function () {
    return injectCheckboxRootContext;
  }
});
//# sourceMappingURL=CheckboxRoot.cjs.map