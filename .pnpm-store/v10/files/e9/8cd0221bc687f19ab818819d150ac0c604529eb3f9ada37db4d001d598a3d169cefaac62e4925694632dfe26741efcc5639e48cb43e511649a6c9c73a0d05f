const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const require_ToggleGroup_ToggleGroupRoot = require('../ToggleGroup/ToggleGroupRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Toggle/Toggle.vue?vue&type=script&setup=true&lang.ts
var Toggle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "Toggle",
	props: {
		defaultValue: {
			type: Boolean,
			required: false
		},
		modelValue: {
			type: [Boolean, null],
			required: false,
			default: void 0
		},
		disabled: {
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
		const toggleGroupContext = require_ToggleGroup_ToggleGroupRoot.injectToggleGroupRootContext(null);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function togglePressed() {
			modelValue.value = !modelValue.value;
		}
		const dataState = (0, vue.computed)(() => {
			return modelValue.value ? "on" : "off";
		});
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				"as-child": props.asChild,
				as: _ctx.as,
				"aria-pressed": (0, vue.unref)(modelValue),
				"data-state": dataState.value,
				"data-disabled": _ctx.disabled ? "" : void 0,
				disabled: _ctx.disabled,
				onClick: togglePressed
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					disabled: _ctx.disabled,
					pressed: (0, vue.unref)(modelValue),
					state: dataState.value
				}), (0, vue.unref)(isFormControl) && _ctx.name && !(0, vue.unref)(toggleGroupContext) ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default, {
					key: 0,
					type: "checkbox",
					name: _ctx.name,
					value: (0, vue.unref)(modelValue),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 8, [
				"type",
				"as-child",
				"as",
				"aria-pressed",
				"data-state",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/Toggle/Toggle.vue
var Toggle_default = Toggle_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'Toggle_default', {
  enumerable: true,
  get: function () {
    return Toggle_default;
  }
});
//# sourceMappingURL=Toggle.cjs.map