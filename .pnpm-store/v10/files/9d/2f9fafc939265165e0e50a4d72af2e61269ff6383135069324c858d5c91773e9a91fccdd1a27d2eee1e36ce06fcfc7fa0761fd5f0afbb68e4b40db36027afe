const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Checkbox/CheckboxGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectCheckboxGroupRootContext, provideCheckboxGroupRootContext] = require_shared_createContext.createContext("CheckboxGroupRoot");
var CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CheckboxGroupRoot",
	props: {
		defaultValue: {
			type: Array,
			required: false
		},
		modelValue: {
			type: Array,
			required: false
		},
		rovingFocus: {
			type: Boolean,
			required: false,
			default: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { disabled, rovingFocus, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? [],
			passive: props.modelValue === void 0
		});
		const rovingFocusProps = (0, vue.computed)(() => {
			return rovingFocus.value ? {
				loop: props.loop,
				dir: dir.value,
				orientation: props.orientation
			} : {};
		});
		provideCheckboxGroupRootContext({
			modelValue,
			rovingFocus,
			disabled
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(rovingFocus) ? (0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default) : (0, vue.unref)(require_Primitive_Primitive.Primitive)), (0, vue.mergeProps)({
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, rovingFocusProps.value), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default"), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					name: _ctx.name,
					value: (0, vue.unref)(modelValue),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/Checkbox/CheckboxGroupRoot.vue
var CheckboxGroupRoot_default = CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CheckboxGroupRoot_default', {
  enumerable: true,
  get: function () {
    return CheckboxGroupRoot_default;
  }
});
Object.defineProperty(exports, 'injectCheckboxGroupRootContext', {
  enumerable: true,
  get: function () {
    return injectCheckboxGroupRootContext;
  }
});
//# sourceMappingURL=CheckboxGroupRoot.cjs.map