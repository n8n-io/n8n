const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/PinInput/PinInputRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPinInputRootContext, providePinInputRootContext] = require_shared_createContext.createContext("PinInputRoot");
var PinInputRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "PinInputRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: Array,
			required: false
		},
		placeholder: {
			type: String,
			required: false,
			default: ""
		},
		mask: {
			type: Boolean,
			required: false
		},
		otp: {
			type: Boolean,
			required: false
		},
		type: {
			type: null,
			required: false,
			default: "text"
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
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
			required: false
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
	emits: ["update:modelValue", "complete"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { mask, otp, placeholder, type, disabled, dir: propDir } = (0, vue.toRefs)(props);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const dir = require_shared_useDirection.useDirection(propDir);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? [],
			passive: props.modelValue === void 0
		});
		const currentModelValue = (0, vue.computed)(() => Array.isArray(modelValue.value) ? [...modelValue.value] : []);
		const inputElements = (0, vue.ref)(/* @__PURE__ */ new Set());
		function onInputElementChange(el) {
			inputElements.value.add(el);
		}
		const isNumericMode = (0, vue.computed)(() => props.type === "number");
		const isCompleted = (0, vue.computed)(() => {
			const modelValues = currentModelValue.value.filter((i) => !!i || isNumericMode.value && i === 0);
			return modelValues.length === inputElements.value.size;
		});
		(0, vue.watch)(modelValue, () => {
			if (isCompleted.value) emits("complete", modelValue.value);
		}, { deep: true });
		providePinInputRootContext({
			modelValue,
			currentModelValue,
			mask,
			otp,
			placeholder,
			type,
			dir,
			disabled,
			isCompleted,
			inputElements,
			onInputElementChange,
			isNumericMode
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				ref: (0, vue.unref)(forwardRef),
				dir: (0, vue.unref)(dir),
				"data-complete": isCompleted.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.createVNode)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default, {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: currentModelValue.value.join(""),
					name: _ctx.name ?? "",
					disabled: (0, vue.unref)(disabled),
					required: _ctx.required,
					onFocus: _cache[0] || (_cache[0] = ($event) => Array.from(inputElements.value)?.[0]?.focus())
				}, null, 8, [
					"id",
					"value",
					"name",
					"disabled",
					"required"
				])]),
				_: 3
			}, 16, [
				"dir",
				"data-complete",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/PinInput/PinInputRoot.vue
var PinInputRoot_default = PinInputRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PinInputRoot_default', {
  enumerable: true,
  get: function () {
    return PinInputRoot_default;
  }
});
Object.defineProperty(exports, 'injectPinInputRootContext', {
  enumerable: true,
  get: function () {
    return injectPinInputRootContext;
  }
});
//# sourceMappingURL=PinInputRoot.cjs.map