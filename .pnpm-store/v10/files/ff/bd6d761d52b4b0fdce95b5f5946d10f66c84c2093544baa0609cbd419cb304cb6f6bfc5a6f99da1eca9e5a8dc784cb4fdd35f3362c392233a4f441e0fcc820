const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Listbox_ListboxRoot = require('../Listbox/ListboxRoot.cjs');
const require_Listbox_ListboxFilter = require('../Listbox/ListboxFilter.cjs');
const require_Combobox_ComboboxRoot = require('../Combobox/ComboboxRoot.cjs');
const require_Autocomplete_AutocompleteRoot = require('./AutocompleteRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Autocomplete/AutocompleteInput.vue?vue&type=script&setup=true&lang.ts
var AutocompleteInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "AutocompleteInput",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "input"
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const autocompleteContext = require_Autocomplete_AutocompleteRoot.injectAutocompleteRootContext();
		const listboxContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, { passive: props.modelValue === void 0 });
		if (autocompleteContext.modelValue.value) modelValue.value = autocompleteContext.modelValue.value;
		(0, vue.onMounted)(() => {
			if (currentElement.value) rootContext.onInputElementChange(currentElement.value);
		});
		function handleKeyDown(ev) {
			if (!rootContext.open.value) rootContext.onOpenChange(true);
		}
		function handleInput(event) {
			const target = event.target;
			if (!rootContext.open.value) {
				rootContext.onOpenChange(true);
				(0, vue.nextTick)(() => {
					if (target.value) {
						rootContext.filterSearch.value = target.value;
						listboxContext.highlightFirstItem();
					}
				});
			} else rootContext.filterSearch.value = target.value;
			autocompleteContext.modelValue.value = target.value;
		}
		function handleFocus() {
			if (rootContext.openOnFocus.value && !rootContext.open.value) rootContext.onOpenChange(true);
		}
		function handleClick() {
			if (rootContext.openOnClick.value && !rootContext.open.value) rootContext.onOpenChange(true);
		}
		(0, vue.watch)(autocompleteContext.modelValue, (newVal) => {
			const text = newVal ?? "";
			if (modelValue.value !== text) modelValue.value = text;
		});
		rootContext.onResetSearchTerm(() => {
			modelValue.value = autocompleteContext.modelValue.value ?? "";
		});
		(0, vue.watch)(rootContext.filterState, (_newValue, oldValue) => {
			if (!rootContext.isVirtual.value && oldValue.count === 0) listboxContext.highlightFirstItem();
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxFilter.ListboxFilter_default), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				modelValue: (0, vue.unref)(modelValue),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(modelValue) ? modelValue.value = $event : null),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"auto-focus": _ctx.autoFocus,
				disabled: _ctx.disabled,
				"aria-expanded": (0, vue.unref)(rootContext).open.value,
				"aria-controls": (0, vue.unref)(rootContext).contentId,
				"aria-autocomplete": "list",
				role: "combobox",
				autocomplete: "off",
				onClick: handleClick,
				onInput: handleInput,
				onKeydown: (0, vue.withKeys)((0, vue.withModifiers)(handleKeyDown, ["prevent"]), ["down", "up"]),
				onFocus: handleFocus
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"modelValue",
				"as",
				"as-child",
				"auto-focus",
				"disabled",
				"aria-expanded",
				"aria-controls",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Autocomplete/AutocompleteInput.vue
var AutocompleteInput_default = AutocompleteInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AutocompleteInput_default', {
  enumerable: true,
  get: function () {
    return AutocompleteInput_default;
  }
});
//# sourceMappingURL=AutocompleteInput.cjs.map