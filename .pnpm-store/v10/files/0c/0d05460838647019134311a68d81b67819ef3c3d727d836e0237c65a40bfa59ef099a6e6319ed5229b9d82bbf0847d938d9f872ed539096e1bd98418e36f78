import { createContext } from "../shared/createContext.js";
import { isNullish } from "../shared/nullish.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useCollection } from "../Collection/Collection.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { BubbleSelect_default } from "./BubbleSelect.js";
import { compare, valueComparator } from "./utils.js";
import { Fragment, computed, createBlock, createCommentVNode, createElementBlock, defineComponent, mergeProps, openBlock, ref, renderList, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Select/SelectRoot.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = {
	key: 0,
	value: ""
};
const [injectSelectRootContext, provideSelectRootContext] = createContext("SelectRoot");
var SelectRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "SelectRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		defaultOpen: {
			type: Boolean,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		modelValue: {
			type: null,
			required: false,
			default: void 0
		},
		by: {
			type: [String, Function],
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		autocomplete: {
			type: String,
			required: false
		},
		disabled: {
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
	emits: ["update:modelValue", "update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { required, disabled, multiple, dir: propDir } = toRefs(props);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		const open = useVModel(props, "open", emits, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = ref();
		const valueElement = ref();
		const triggerPointerDownPosRef = ref({
			x: 0,
			y: 0
		});
		const isEmptyModelValue = computed(() => {
			if (multiple.value && Array.isArray(modelValue.value)) return modelValue.value?.length === 0;
			else return isNullish(modelValue.value);
		});
		useCollection({ isProvider: true });
		const dir = useDirection(propDir);
		const isFormControl = useFormControl(triggerElement);
		const optionsSet = ref(/* @__PURE__ */ new Set());
		const nativeSelectKey = computed(() => {
			return Array.from(optionsSet.value).map((option) => option.value).join(";");
		});
		function handleValueChange(value) {
			if (multiple.value) {
				const array = Array.isArray(modelValue.value) ? [...modelValue.value] : [];
				const index = array.findIndex((i) => compare(i, value, props.by));
				index === -1 ? array.push(value) : array.splice(index, 1);
				modelValue.value = [...array];
			} else modelValue.value = value;
		}
		function getOption(value) {
			return Array.from(optionsSet.value).find((option) => valueComparator(value, option.value, props.by));
		}
		provideSelectRootContext({
			triggerElement,
			onTriggerChange: (node) => {
				triggerElement.value = node;
			},
			valueElement,
			onValueElementChange: (node) => {
				valueElement.value = node;
			},
			contentId: "",
			modelValue,
			onValueChange: handleValueChange,
			by: props.by,
			open,
			multiple,
			required,
			onOpenChange: (value) => {
				open.value = value;
			},
			dir,
			triggerPointerDownPosRef,
			disabled,
			isEmptyModelValue,
			optionsSet,
			onOptionAdd: (option) => {
				const existingOption = getOption(option.value);
				if (existingOption) optionsSet.value.delete(existingOption);
				optionsSet.value.add(option);
			},
			onOptionRemove: (option) => {
				const existingOption = getOption(option.value);
				if (existingOption) optionsSet.value.delete(existingOption);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					open: unref(open)
				}), unref(isFormControl) ? (openBlock(), createBlock(BubbleSelect_default, {
					key: nativeSelectKey.value,
					"aria-hidden": "true",
					tabindex: "-1",
					multiple: unref(multiple),
					required: unref(required),
					name: _ctx.name,
					autocomplete: _ctx.autocomplete,
					disabled: unref(disabled),
					value: unref(modelValue)
				}, {
					default: withCtx(() => [unref(isNullish)(unref(modelValue)) ? (openBlock(), createElementBlock("option", _hoisted_1)) : createCommentVNode("v-if", true), (openBlock(true), createElementBlock(Fragment, null, renderList(Array.from(optionsSet.value), (option) => {
						return openBlock(), createElementBlock("option", mergeProps({ key: option.value ?? "" }, { ref_for: true }, option), null, 16);
					}), 128))]),
					_: 1
				}, 8, [
					"multiple",
					"required",
					"name",
					"autocomplete",
					"disabled",
					"value"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Select/SelectRoot.vue
var SelectRoot_default = SelectRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectRoot_default, injectSelectRootContext, provideSelectRootContext };
//# sourceMappingURL=SelectRoot.js.map