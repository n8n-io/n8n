const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFormControl = require('../shared/useFormControl.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_DismissableLayer_utils = require('../DismissableLayer/utils.cjs');
const require_VisuallyHidden_VisuallyHiddenInput = require('../VisuallyHidden/VisuallyHiddenInput.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Editable/EditableRoot.vue?vue&type=script&setup=true&lang.ts
const [injectEditableRootContext, provideEditableRootContext] = require_shared_createContext.createContext("EditableRoot");
var EditableRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "EditableRoot",
	props: {
		defaultValue: {
			type: String,
			required: false
		},
		modelValue: {
			type: [String, null],
			required: false
		},
		placeholder: {
			type: [String, Object],
			required: false,
			default: "Enter text..."
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		readonly: {
			type: Boolean,
			required: false
		},
		activationMode: {
			type: String,
			required: false,
			default: "focus"
		},
		selectOnFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		submitMode: {
			type: String,
			required: false,
			default: "blur"
		},
		startWithEditMode: {
			type: Boolean,
			required: false
		},
		maxLength: {
			type: Number,
			required: false
		},
		autoResize: {
			type: Boolean,
			required: false,
			default: false
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
			default: "div"
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
	emits: [
		"update:modelValue",
		"submit",
		"update:state"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { id, name, defaultValue, startWithEditMode, placeholder: propPlaceholder, maxLength, disabled, dir: propDir, submitMode, activationMode, selectOnFocus, readonly, autoResize, required } = (0, vue.toRefs)(props);
		const inputRef = (0, vue.ref)();
		const dir = require_shared_useDirection.useDirection(propDir);
		const isEditing = (0, vue.ref)(startWithEditMode.value ?? false);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: defaultValue.value ?? "",
			passive: props.modelValue === void 0
		});
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const isFormControl = require_shared_useFormControl.useFormControl(currentElement);
		const placeholder = (0, vue.computed)(() => {
			return typeof propPlaceholder.value === "string" ? {
				edit: propPlaceholder.value,
				preview: propPlaceholder.value
			} : propPlaceholder.value;
		});
		const inputValue = (0, vue.ref)(modelValue.value);
		(0, vue.watch)(() => modelValue.value, () => {
			inputValue.value = modelValue.value;
		}, {
			immediate: true,
			deep: true
		});
		function cancel() {
			isEditing.value = false;
			emits("update:state", "cancel");
		}
		function edit() {
			isEditing.value = true;
			inputValue.value = modelValue.value;
			emits("update:state", "edit");
		}
		function submit() {
			modelValue.value = inputValue.value;
			isEditing.value = false;
			emits("update:state", "submit");
			emits("submit", modelValue.value);
		}
		function handleDismiss() {
			if (isEditing.value) if (submitMode.value === "blur" || submitMode.value === "both") submit();
			else cancel();
		}
		const pointerDownOutside = require_DismissableLayer_utils.usePointerDownOutside(() => handleDismiss(), currentElement, isEditing);
		const focusOutside = require_DismissableLayer_utils.useFocusOutside(() => handleDismiss(), currentElement, isEditing);
		const isEmpty = (0, vue.computed)(() => modelValue.value === "");
		__expose({
			submit,
			cancel,
			edit
		});
		provideEditableRootContext({
			id,
			name,
			disabled,
			isEditing,
			maxLength,
			modelValue,
			inputValue,
			placeholder,
			edit,
			cancel,
			submit,
			activationMode,
			submitMode,
			selectOnFocus,
			inputRef,
			startWithEditMode,
			isEmpty,
			readonly,
			autoResize
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				dir: (0, vue.unref)(dir),
				"data-dismissable-layer": "",
				onFocusCapture: (0, vue.unref)(focusOutside).onFocusCapture,
				onBlurCapture: (0, vue.unref)(focusOutside).onBlurCapture,
				onPointerdownCapture: (0, vue.unref)(pointerDownOutside).onPointerDownCapture
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					modelValue: (0, vue.unref)(modelValue),
					isEditing: isEditing.value,
					isEmpty: isEmpty.value,
					submit,
					cancel,
					edit
				}), (0, vue.unref)(isFormControl) && (0, vue.unref)(name) ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHiddenInput.VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: (0, vue.unref)(modelValue),
					name: (0, vue.unref)(name),
					disabled: (0, vue.unref)(disabled),
					required: (0, vue.unref)(required)
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"required"
				])) : (0, vue.createCommentVNode)("v-if", true)]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"dir",
				"onFocusCapture",
				"onBlurCapture",
				"onPointerdownCapture"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditableRoot.vue
var EditableRoot_default = EditableRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'EditableRoot_default', {
  enumerable: true,
  get: function () {
    return EditableRoot_default;
  }
});
Object.defineProperty(exports, 'injectEditableRootContext', {
  enumerable: true,
  get: function () {
    return injectEditableRootContext;
  }
});
//# sourceMappingURL=EditableRoot.cjs.map