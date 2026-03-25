const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/RadioGroup/RadioGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectRadioGroupRootContext, provideRadioGroupRootContext] = require_shared_createContext.createContext("RadioGroupRoot");
var RadioGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "RadioGroupRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		orientation: {
			type: String,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
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
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const { disabled, loop, orientation, name, required, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		provideRadioGroupRootContext({
			modelValue,
			changeModelValue: (value) => {
				modelValue.value = value;
			},
			disabled,
			loop,
			orientation,
			name: name?.value,
			required
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
				"as-child": "",
				orientation: (0, vue.unref)(orientation),
				dir: (0, vue.unref)(dir),
				loop: (0, vue.unref)(loop)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "radiogroup",
					"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"aria-orientation": (0, vue.unref)(orientation),
					"aria-required": (0, vue.unref)(required),
					dir: (0, vue.unref)(dir)
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.unref)(isFormControl) && (0, vue.unref)(name) ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
						key: 0,
						required: (0, vue.unref)(required),
						disabled: (0, vue.unref)(disabled),
						value: (0, vue.unref)(modelValue),
						name: (0, vue.unref)(name)
					}, null, 8, [
						"required",
						"disabled",
						"value",
						"name"
					])) : (0, vue.createCommentVNode)("v-if", true)]),
					_: 3
				}, 8, [
					"data-disabled",
					"as-child",
					"as",
					"aria-orientation",
					"aria-required",
					"dir"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/RadioGroupRoot.vue
var RadioGroupRoot_default = RadioGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RadioGroupRoot_default', {
  enumerable: true,
  get: function () {
    return RadioGroupRoot_default;
  }
});
Object.defineProperty(exports, 'injectRadioGroupRootContext', {
  enumerable: true,
  get: function () {
    return injectRadioGroupRootContext;
  }
});
//# sourceMappingURL=RadioGroupRoot.cjs.map