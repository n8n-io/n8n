import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFilter } from "../shared/useFilter.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { ListboxRoot_default } from "../Listbox/ListboxRoot.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { provideComboboxRootContext } from "../Combobox/ComboboxRoot.js";
import { computed, createBlock, createVNode, defineComponent, getCurrentInstance, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { createEventHook, useVModel } from "@vueuse/core";

//#region src/Autocomplete/AutocompleteRoot.vue?vue&type=script&setup=true&lang.ts
const [injectAutocompleteRootContext, provideAutocompleteRootContext] = createContext("AutocompleteRoot");
var AutocompleteRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AutocompleteRoot",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		defaultValue: {
			type: String,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		defaultOpen: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		dir: {
			type: String,
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
		resetSearchTermOnBlur: {
			type: Boolean,
			required: false,
			default: false
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
		highlightOnHover: {
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
		const { disabled, ignoreFilter, openOnFocus, openOnClick, dir: propDir, highlightOnHover } = toRefs(props);
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? "",
			passive: props.modelValue === void 0
		});
		const open = useVModel(props, "open", emits, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const contextModelValue = computed({
			get: () => modelValue.value,
			set: (val) => {
				if (val === null || val === void 0) modelValue.value = "";
				else modelValue.value = String(val);
			}
		});
		async function onOpenChange(val) {
			open.value = val;
			if (val) {
				filterSearch.value = modelValue.value || "";
				await nextTick();
				primitiveElement.value?.highlightSelected();
				isUserInputted.value = true;
				inputElement.value?.focus();
			} else {
				isUserInputted.value = false;
				filterSearch.value = "";
				setTimeout(() => {
					if (!val && props.resetSearchTermOnBlur) resetSearchTerm.trigger();
				}, 1);
			}
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
			modelValue: contextModelValue,
			multiple: ref(false),
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
			resetSearchTermOnSelect: ref(false),
			onResetSearchTerm: resetSearchTerm.on,
			allItems,
			allGroups,
			filterSearch,
			filterState,
			ignoreFilter,
			openOnFocus,
			openOnClick,
			resetModelValueOnClear: ref(true)
		});
		provideAutocompleteRootContext({ modelValue });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [createVNode(unref(ListboxRoot_default), mergeProps({
					ref_key: "primitiveElement",
					ref: primitiveElement
				}, _ctx.$attrs, {
					modelValue: contextModelValue.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => contextModelValue.value = $event),
					style: { pointerEvents: unref(open) ? "auto" : void 0 },
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: unref(dir),
					name: _ctx.name,
					required: _ctx.required,
					disabled: unref(disabled),
					"highlight-on-hover": unref(highlightOnHover),
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
					"name",
					"required",
					"disabled",
					"highlight-on-hover"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Autocomplete/AutocompleteRoot.vue
var AutocompleteRoot_default = AutocompleteRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AutocompleteRoot_default, injectAutocompleteRootContext };
//# sourceMappingURL=AutocompleteRoot.js.map