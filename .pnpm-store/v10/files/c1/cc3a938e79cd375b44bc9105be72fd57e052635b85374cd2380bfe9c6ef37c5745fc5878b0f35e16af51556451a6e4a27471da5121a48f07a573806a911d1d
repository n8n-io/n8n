const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useFilter = require('../shared/useFilter.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Popper_PopperRoot = require('../Popper/PopperRoot.cjs');
const require_Listbox_ListboxRoot = require('../Listbox/ListboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Combobox/ComboboxRoot.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxRootContext, provideComboboxRootContext] = require_shared_createContext.createContext("ComboboxRoot");
var ComboboxRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { primitiveElement, currentElement: parentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const { multiple, disabled, ignoreFilter, resetSearchTermOnSelect, openOnFocus, openOnClick, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (multiple.value ? [] : void 0),
			passive: props.modelValue === void 0,
			deep: true
		});
		const open = (0, __vueuse_core.useVModel)(props, "open", emits, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		async function onOpenChange(val) {
			open.value = val;
			filterSearch.value = "";
			if (val) {
				await (0, vue.nextTick)();
				primitiveElement.value?.highlightSelected();
				isUserInputted.value = true;
			} else isUserInputted.value = false;
			inputElement.value?.focus();
			setTimeout(() => {
				if (!val && props.resetSearchTermOnBlur) resetSearchTerm.trigger();
			}, 1);
		}
		const resetSearchTerm = (0, __vueuse_core.createEventHook)();
		const isUserInputted = (0, vue.ref)(false);
		const isVirtual = (0, vue.ref)(false);
		const inputElement = (0, vue.ref)();
		const triggerElement = (0, vue.ref)();
		const highlightedElement = (0, vue.computed)(() => primitiveElement.value?.highlightedElement ?? void 0);
		const allItems = (0, vue.ref)(/* @__PURE__ */ new Map());
		const allGroups = (0, vue.ref)(/* @__PURE__ */ new Map());
		const { contains } = require_shared_useFilter.useFilter({ sensitivity: "base" });
		const filterSearch = (0, vue.ref)("");
		const filterState = (0, vue.computed)((oldValue) => {
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
		const inst = (0, vue.getCurrentInstance)();
		(0, vue.onMounted)(() => {
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperRoot.PopperRoot_default), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Listbox_ListboxRoot.ListboxRoot_default), (0, vue.mergeProps)({
					ref_key: "primitiveElement",
					ref: primitiveElement
				}, _ctx.$attrs, {
					modelValue: (0, vue.unref)(modelValue),
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(modelValue) ? modelValue.value = $event : null),
					style: { pointerEvents: (0, vue.unref)(open) ? "auto" : void 0 },
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: (0, vue.unref)(dir),
					multiple: (0, vue.unref)(multiple),
					name: _ctx.name,
					required: _ctx.required,
					disabled: (0, vue.unref)(disabled),
					"highlight-on-hover": true,
					by: props.by,
					onHighlight: _cache[1] || (_cache[1] = ($event) => emits("highlight", $event))
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
						open: (0, vue.unref)(open),
						modelValue: (0, vue.unref)(modelValue)
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
Object.defineProperty(exports, 'ComboboxRoot_default', {
  enumerable: true,
  get: function () {
    return ComboboxRoot_default;
  }
});
Object.defineProperty(exports, 'injectComboboxRootContext', {
  enumerable: true,
  get: function () {
    return injectComboboxRootContext;
  }
});
//# sourceMappingURL=ComboboxRoot.cjs.map