import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectListboxRootContext } from "../Listbox/ListboxRoot.js";
import { ListboxFilter_default } from "../Listbox/ListboxFilter.js";
import { injectComboboxRootContext } from "../Combobox/ComboboxRoot.js";
import { injectAutocompleteRootContext } from "./AutocompleteRoot.js";
import { createBlock, defineComponent, isRef, nextTick, onMounted, openBlock, renderSlot, unref, watch, withCtx, withKeys, withModifiers } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Autocomplete/AutocompleteInput.vue?vue&type=script&setup=true&lang.ts
var AutocompleteInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectComboboxRootContext();
		const autocompleteContext = injectAutocompleteRootContext();
		const listboxContext = injectListboxRootContext();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const modelValue = useVModel(props, "modelValue", emits, { passive: props.modelValue === void 0 });
		if (autocompleteContext.modelValue.value) modelValue.value = autocompleteContext.modelValue.value;
		onMounted(() => {
			if (currentElement.value) rootContext.onInputElementChange(currentElement.value);
		});
		function handleKeyDown(ev) {
			if (!rootContext.open.value) rootContext.onOpenChange(true);
		}
		function handleInput(event) {
			const target = event.target;
			if (!rootContext.open.value) {
				rootContext.onOpenChange(true);
				nextTick(() => {
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
		watch(autocompleteContext.modelValue, (newVal) => {
			const text = newVal ?? "";
			if (modelValue.value !== text) modelValue.value = text;
		});
		rootContext.onResetSearchTerm(() => {
			modelValue.value = autocompleteContext.modelValue.value ?? "";
		});
		watch(rootContext.filterState, (_newValue, oldValue) => {
			if (!rootContext.isVirtual.value && oldValue.count === 0) listboxContext.highlightFirstItem();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ListboxFilter_default), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				modelValue: unref(modelValue),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(modelValue) ? modelValue.value = $event : null),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"auto-focus": _ctx.autoFocus,
				disabled: _ctx.disabled,
				"aria-expanded": unref(rootContext).open.value,
				"aria-controls": unref(rootContext).contentId,
				"aria-autocomplete": "list",
				role: "combobox",
				autocomplete: "off",
				onClick: handleClick,
				onInput: handleInput,
				onKeydown: withKeys(withModifiers(handleKeyDown, ["prevent"]), ["down", "up"]),
				onFocus: handleFocus
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { AutocompleteInput_default };
//# sourceMappingURL=AutocompleteInput.js.map