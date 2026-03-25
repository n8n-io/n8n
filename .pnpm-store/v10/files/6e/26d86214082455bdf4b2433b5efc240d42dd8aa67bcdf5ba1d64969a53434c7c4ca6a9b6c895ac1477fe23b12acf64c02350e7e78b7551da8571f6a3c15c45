const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Switch/SwitchRoot.vue?vue&type=script&setup=true&lang.ts
const [injectSwitchRootContext, provideSwitchRootContext] = require_shared_createContext.createContext("SwitchRoot");
var SwitchRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SwitchRoot",
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
			required: false
		},
		id: {
			type: String,
			required: false
		},
		value: {
			type: String,
			required: false,
			default: "on"
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
		const emit = __emit;
		const { disabled } = (0, vue.toRefs)(props);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emit, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function toggleCheck() {
			if (disabled.value) return;
			modelValue.value = !modelValue.value;
		}
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const ariaLabel = (0, vue.computed)(() => props.id && currentElement.value ? document.querySelector(`[for="${props.id}"]`)?.innerText : void 0);
		provideSwitchRootContext({
			modelValue,
			toggleCheck,
			disabled
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				id: _ctx.id,
				ref: (0, vue.unref)(forwardRef),
				role: "switch",
				type: _ctx.as === "button" ? "button" : void 0,
				value: _ctx.value,
				"aria-label": _ctx.$attrs["aria-label"] || ariaLabel.value,
				"aria-checked": (0, vue.unref)(modelValue),
				"aria-required": _ctx.required,
				"data-state": (0, vue.unref)(modelValue) ? "checked" : "unchecked",
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				disabled: (0, vue.unref)(disabled),
				onClick: toggleCheck,
				onKeydown: (0, vue.withKeys)((0, vue.withModifiers)(toggleCheck, ["prevent"]), ["enter"])
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "checkbox",
					name: _ctx.name,
					disabled: (0, vue.unref)(disabled),
					required: _ctx.required,
					value: _ctx.value,
					checked: !!(0, vue.unref)(modelValue)
				}, null, 8, [
					"name",
					"disabled",
					"required",
					"value",
					"checked"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, [
				"id",
				"type",
				"value",
				"aria-label",
				"aria-checked",
				"aria-required",
				"data-state",
				"data-disabled",
				"as-child",
				"as",
				"disabled",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Switch/SwitchRoot.vue
var SwitchRoot_default = SwitchRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SwitchRoot_default', {
  enumerable: true,
  get: function () {
    return SwitchRoot_default;
  }
});
Object.defineProperty(exports, 'injectSwitchRootContext', {
  enumerable: true,
  get: function () {
    return injectSwitchRootContext;
  }
});
//# sourceMappingURL=SwitchRoot.cjs.map