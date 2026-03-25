import { createContext } from "../shared/createContext.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { computed, createBlock, createCommentVNode, createVNode, defineComponent, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useFocusWithin, useVModel } from "@vueuse/core";

//#region src/TagsInput/TagsInputRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTagsInputRootContext, provideTagsInputRootContext] = createContext("TagsInputRoot");
var TagsInputRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputRoot",
	props: {
		modelValue: {
			type: [Array, null],
			required: false
		},
		defaultValue: {
			type: Array,
			required: false,
			default: () => []
		},
		addOnPaste: {
			type: Boolean,
			required: false
		},
		addOnTab: {
			type: Boolean,
			required: false
		},
		addOnBlur: {
			type: Boolean,
			required: false
		},
		duplicate: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		delimiter: {
			type: null,
			required: false,
			default: ","
		},
		dir: {
			type: String,
			required: false
		},
		max: {
			type: Number,
			required: false,
			default: 0
		},
		id: {
			type: String,
			required: false
		},
		convertValue: {
			type: Function,
			required: false
		},
		displayValue: {
			type: Function,
			required: false,
			default: (value) => value.toString()
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
	emits: [
		"update:modelValue",
		"invalid",
		"addTag",
		"removeTag"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { addOnPaste, disabled, delimiter, max, id, dir: propDir, addOnBlur, addOnTab } = toRefs(props);
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: true,
			deep: true
		});
		const { forwardRef, currentElement } = useForwardExpose();
		const { focused } = useFocusWithin(currentElement);
		const isFormControl = useFormControl(currentElement);
		const { getItems, CollectionSlot } = useCollection({ isProvider: true });
		const selectedElement = ref();
		const isInvalidInput = ref(false);
		const currentModelValue = computed(() => Array.isArray(modelValue.value) ? [...modelValue.value] : []);
		function handleRemoveTag(index) {
			if (index !== -1) {
				const collection = getItems().filter((i) => i.ref.dataset.disabled !== "");
				modelValue.value = modelValue.value.filter((_, i) => i !== index);
				emits("removeTag", collection[index].value);
			}
		}
		provideTagsInputRootContext({
			modelValue,
			onAddValue: (_payload) => {
				const array = [...currentModelValue.value];
				const modelValueIsObject = array.length > 0 && typeof array[0] === "object";
				const defaultValueIsObject = array.length > 0 && typeof props.defaultValue[0] === "object";
				if ((modelValueIsObject || defaultValueIsObject) && typeof props.convertValue !== "function") throw new Error("You must provide a `convertValue` function when using objects as values.");
				const payload = props.convertValue ? props.convertValue(_payload) : _payload;
				if (array.length >= max.value && !!max.value) {
					emits("invalid", payload);
					return false;
				}
				if (props.duplicate) {
					modelValue.value = [...array, payload];
					emits("addTag", payload);
					return true;
				} else {
					const exist = array.includes(payload);
					if (!exist) {
						modelValue.value = [...array, payload];
						emits("addTag", payload);
						return true;
					} else isInvalidInput.value = true;
				}
				emits("invalid", payload);
				return false;
			},
			onRemoveValue: handleRemoveTag,
			onInputKeydown: (event) => {
				const target = event.target;
				const collection = getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
				if (!collection.length) return;
				const lastTag = collection.at(-1);
				switch (event.key) {
					case "Delete":
					case "Backspace": {
						if (target.selectionStart !== 0 || target.selectionEnd !== 0) break;
						if (selectedElement.value) {
							const index = collection.findIndex((i) => i === selectedElement.value);
							handleRemoveTag(index);
							selectedElement.value = selectedElement.value === lastTag ? collection.at(index - 1) : collection.at(index + 1);
							event.preventDefault();
						} else if (event.key === "Backspace") {
							selectedElement.value = lastTag;
							event.preventDefault();
						}
						break;
					}
					case "Home":
					case "End":
					case "ArrowRight":
					case "ArrowLeft": {
						const isArrowRight = event.key === "ArrowRight" && dir.value === "ltr" || event.key === "ArrowLeft" && dir.value === "rtl";
						const isArrowLeft = !isArrowRight;
						if (target.selectionStart !== 0 || target.selectionEnd !== 0) break;
						if (isArrowLeft && !selectedElement.value) {
							selectedElement.value = lastTag;
							event.preventDefault();
						} else if (isArrowRight && lastTag && selectedElement.value === lastTag) {
							selectedElement.value = void 0;
							event.preventDefault();
						} else if (selectedElement.value) {
							const el = useArrowNavigation(event, selectedElement.value, void 0, {
								itemsArray: collection,
								loop: false,
								dir: dir.value
							});
							if (el) selectedElement.value = el;
							event.preventDefault();
						}
						break;
					}
					case "ArrowUp":
					case "ArrowDown": {
						if (selectedElement.value) event.preventDefault();
						break;
					}
					default: selectedElement.value = void 0;
				}
			},
			selectedElement,
			isInvalidInput,
			addOnPaste,
			addOnBlur,
			addOnTab,
			dir,
			disabled,
			delimiter,
			max,
			id,
			displayValue: props.displayValue
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					dir: unref(dir),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-invalid": isInvalidInput.value ? "" : void 0,
					"data-disabled": unref(disabled) ? "" : void 0,
					"data-focused": unref(focused) ? "" : void 0
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
						key: 0,
						name: _ctx.name,
						value: unref(modelValue),
						required: _ctx.required,
						disabled: unref(disabled)
					}, null, 8, [
						"name",
						"value",
						"required",
						"disabled"
					])) : createCommentVNode("v-if", true)]),
					_: 3
				}, 8, [
					"dir",
					"as",
					"as-child",
					"data-invalid",
					"data-disabled",
					"data-focused"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputRoot.vue
var TagsInputRoot_default = TagsInputRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputRoot_default, injectTagsInputRootContext };
//# sourceMappingURL=TagsInputRoot.js.map