const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useSingleOrMultipleValue = require('../shared/useSingleOrMultipleValue.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ToggleGroup/ToggleGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectToggleGroupRootContext, provideToggleGroupRootContext] = require_shared_createContext.createContext("ToggleGroupRoot");
var ToggleGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToggleGroupRoot",
	props: {
		rovingFocus: {
			type: Boolean,
			required: false,
			default: true
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		orientation: {
			type: String,
			required: false
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
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { loop, rovingFocus, disabled, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { modelValue, changeModelValue, isSingle } = require_shared_useSingleOrMultipleValue.useSingleOrMultipleValue(props, emits);
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		provideToggleGroupRootContext({
			isSingle,
			modelValue,
			changeModelValue,
			dir,
			orientation: props.orientation,
			loop,
			rovingFocus,
			disabled
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(rovingFocus) ? (0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default) : (0, vue.unref)(require_Primitive_Primitive.Primitive)), {
				"as-child": "",
				orientation: (0, vue.unref)(rovingFocus) ? _ctx.orientation : void 0,
				dir: (0, vue.unref)(dir),
				loop: (0, vue.unref)(rovingFocus) ? (0, vue.unref)(loop) : void 0
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "group",
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) }), (0, vue.unref)(isFormControl) && _ctx.name ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default, {
						key: 0,
						name: _ctx.name,
						required: _ctx.required,
						value: (0, vue.unref)(modelValue)
					}, null, 8, [
						"name",
						"required",
						"value"
					])) : (0, vue.createCommentVNode)("v-if", true)]),
					_: 3
				}, 8, ["as-child", "as"])]),
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
//#region src/ToggleGroup/ToggleGroupRoot.vue
var ToggleGroupRoot_default = ToggleGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToggleGroupRoot_default', {
  enumerable: true,
  get: function () {
    return ToggleGroupRoot_default;
  }
});
Object.defineProperty(exports, 'injectToggleGroupRootContext', {
  enumerable: true,
  get: function () {
    return injectToggleGroupRootContext;
  }
});
//# sourceMappingURL=ToggleGroupRoot.cjs.map