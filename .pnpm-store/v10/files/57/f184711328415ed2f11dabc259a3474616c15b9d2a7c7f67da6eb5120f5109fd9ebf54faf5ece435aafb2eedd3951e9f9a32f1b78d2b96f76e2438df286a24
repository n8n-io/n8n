import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFilter } from "../shared/useFilter.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { ListboxRoot_default } from "../Listbox/ListboxRoot.js";
import { computed, createBlock, createVNode, defineComponent, getCurrentInstance, isRef, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { createEventHook, useVModel } from "@vueuse/core";

//#region src/Combobox/ComboboxRoot.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxRootContext, provideComboboxRootContext] = createContext("ComboboxRoot");
var ComboboxRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxRoot",
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
		resetSearchTermOnBlur: {
			type: Boolean,
			required: false,
			default: true
		},
		resetSearchTermOnSelect: {
			type: Boolean,
			required: false,
			default: true
		},
		openOnFocus: {
			type: Boolean,
			required: false,
			default: false
		},
		openOnClick: {
			type: Boolean,
			required: false,
			default: false
		},
		ignoreFilter: {
			type: Boolean,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		highlightOnHover: {
			type: Boolean,
			required: false
		},
		by: {
			type: [String, Function],
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
	emits: [
		"update:modelValue",
		"highlight",
		"update:open"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { primitiveElement, currentElement: parentElement } = usePrimitiveElement();
		const { multiple, disabled, ignoreFilter, resetSearchTermOnSelect, openOnFocus, openOnClick, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		const open = useVModel(props, "open", emits, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		async function onOpenChange(val) {
			open.value = val;
			filterSearch.value = "";
			if (val) {
				await nextTick();
				primitiveElement.value?.highlightSelected();
				isUserInputted.value = true;
			} else isUserInputted.value = false;
			inputElement.value?.focus();
			setTimeout(() => {
				if (!val && props.resetSearchTermOnBlur) resetSearchTerm.trigger();
			}, 1);
		}
		const resetSearchTerm = createEventHook();
		const isUserInputted = ref(false);
		const isVirtual = ref(false);
		const inputElement = ref();
		const triggerElement = ref();
		const highlightedElement = computed(() => primitiveElement.value?.highlightedElement ?? void 0);
		const allItems = ref(/* @__PURE__ */ new Map());
		const allGroups = ref(/* @__PURE__ */ new Map());
		const { contains } = useFilter({ sensitivity: "base" });
		const filterSearch = ref("");
		const filterState = computed((oldValue) => {
			if (!filterSearch.value || props.ignoreFilter || isVirtual.value) return {
				count: allItems.value.size,
				items: oldValue?.items ?? /* @__PURE__ */ new Map(),
				groups: oldValue?.groups ?? new Set(allGroups.value.keys())
			};
			let itemCount = 0;
			const filteredItems = /* @__PURE__ */ new Map();
			const filteredGroups = /* @__PURE__ */ new Set();
			for (const [id, value] of allItems.value) {
				const score = contains(value, filterSearch.value);
				filteredItems.set(id, score ? 1 : 0);
				if (score) itemCount++;
			}
			for (const [groupId, group] of allGroups.value) for (const itemId of group) if (filteredItems.get(itemId) > 0) {
				filteredGroups.add(groupId);
				break;
			}
			return {
				count: itemCount,
				items: filteredItems,
				groups: filteredGroups
			};
		});
		const inst = getCurrentInstance();
		onMounted(() => {
			if (inst?.exposed) {
				inst.exposed.highlightItem = primitiveElement.value?.highlightItem;
				inst.exposed.highlightFirstItem = primitiveElement.value?.highlightFirstItem;
				inst.exposed.highlightSelected = primitiveElement.value?.highlightSelected;
			}
		});
		__expose({
			filtered: filterState,
			highlightedElement,
			highlightItem: primitiveElement.value?.highlightItem,
			highlightFirstItem: primitiveElement.value?.highlightFirstItem,
			highlightSelected: primitiveElement.value?.highlightSelected
		});
		provideComboboxRootContext({
			modelValue,
			multiple,
			disabled,
			open,
			onOpenChange,
			contentId: "",
			isUserInputted,
			isVirtual,
			inputElement,
			highlightedElement,
			onInputElementChange: (val) => inputElement.value = val,
			triggerElement,
			onTriggerElementChange: (val) => triggerElement.value = val,
			parentElement,
			resetSearchTermOnSelect,
			onResetSearchTerm: resetSearchTerm.on,
			allItems,
			allGroups,
			filterSearch,
			filterState,
			ignoreFilter,
			openOnFocus,
			openOnClick
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [createVNode(unref(ListboxRoot_default), mergeProps({
					ref_key: "primitiveElement",
					ref: primitiveElement
				}, _ctx.$attrs, {
					modelValue: unref(modelValue),
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(modelValue) ? modelValue.value = $event : null),
					style: { pointerEvents: unref(open) ? "auto" : void 0 },
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: unref(dir),
					multiple: unref(multiple),
					name: _ctx.name,
					required: _ctx.required,
					disabled: unref(disabled),
					"highlight-on-hover": true,
					by: props.by,
					onHighlight: _cache[1] || (_cache[1] = ($event) => emits("highlight", $event))
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
						open: unref(open),
						modelValue: unref(modelValue)
					})]),
					_: 3
				}, 16, [
					"modelValue",
					"style",
					"as",
					"as-child",
					"dir",
					"multiple",
					"name",
					"required",
					"disabled",
					"by"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxRoot.vue
var ComboboxRoot_default = ComboboxRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxRoot_default, injectComboboxRootContext };
//# sourceMappingURL=ComboboxRoot.js.map