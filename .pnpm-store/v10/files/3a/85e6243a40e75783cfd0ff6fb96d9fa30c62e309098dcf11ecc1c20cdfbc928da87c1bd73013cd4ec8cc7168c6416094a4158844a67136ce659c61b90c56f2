import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { useFocusOutside, usePointerDownOutside } from "../DismissableLayer/utils.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Editable/EditableRoot.vue?vue&type=script&setup=true&lang.ts
const [injectEditableRootContext, provideEditableRootContext] = createContext("EditableRoot");
var EditableRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { id, name, defaultValue, startWithEditMode, placeholder: propPlaceholder, maxLength, disabled, dir: propDir, submitMode, activationMode, selectOnFocus, readonly, autoResize, required } = toRefs(props);
		const inputRef = ref();
		const dir = useDirection(propDir);
		const isEditing = ref(startWithEditMode.value ?? false);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: defaultValue.value ?? "",
			passive: props.modelValue === void 0
		});
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const isFormControl = useFormControl(currentElement);
		const placeholder = computed(() => {
			return typeof propPlaceholder.value === "string" ? {
				edit: propPlaceholder.value,
				preview: propPlaceholder.value
			} : propPlaceholder.value;
		});
		const inputValue = ref(modelValue.value);
		watch(() => modelValue.value, () => {
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
		const pointerDownOutside = usePointerDownOutside(() => handleDismiss(), currentElement, isEditing);
		const focusOutside = useFocusOutside(() => handleDismiss(), currentElement, isEditing);
		const isEmpty = computed(() => modelValue.value === "");
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
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				dir: unref(dir),
				"data-dismissable-layer": "",
				onFocusCapture: unref(focusOutside).onFocusCapture,
				onBlurCapture: unref(focusOutside).onBlurCapture,
				onPointerdownCapture: unref(pointerDownOutside).onPointerDownCapture
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					isEditing: isEditing.value,
					isEmpty: isEmpty.value,
					submit,
					cancel,
					edit
				}), unref(isFormControl) && unref(name) ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					type: "text",
					value: unref(modelValue),
					name: unref(name),
					disabled: unref(disabled),
					required: unref(required)
				}, null, 8, [
					"value",
					"name",
					"disabled",
					"required"
				])) : createCommentVNode("v-if", true)]),
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
export { EditableRoot_default, injectEditableRootContext };
//# sourceMappingURL=EditableRoot.js.map