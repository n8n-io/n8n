import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectListboxRootContext } from "../Listbox/ListboxRoot.js";
import { ListboxFilter_default } from "../Listbox/ListboxFilter.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { createBlock, defineComponent, isRef, nextTick, onMounted, openBlock, renderSlot, unref, watch, withCtx, withKeys, withModifiers } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Combobox/ComboboxInput.vue?vue&type=script&setup=true&lang.ts
var ComboboxInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxInput",
	props: {
		displayValue: {
			type: Function,
			required: false
		},
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
		const listboxContext = injectListboxRootContext();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const modelValue = useVModel(props, "modelValue", emits, { passive: props.modelValue === void 0 });
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
		}
		function handleFocus() {
			if (rootContext.openOnFocus.value && !rootContext.open.value) rootContext.onOpenChange(true);
		}
		function handleClick() {
			if (rootContext.openOnClick.value && !rootContext.open.value) rootContext.onOpenChange(true);
		}
		function resetSearchTerm() {
			const rootModelValue = rootContext.modelValue.value;
			if (props.displayValue) modelValue.value = props.displayValue(rootModelValue);
			else if (!rootContext.multiple.value && rootModelValue && !Array.isArray(rootModelValue)) if (typeof rootModelValue !== "object") modelValue.value = rootModelValue.toString();
			else modelValue.value = "";
			else modelValue.value = "";
			nextTick(() => {
				modelValue.value = modelValue.value;
			});
		}
		rootContext.onResetSearchTerm(() => {
			resetSearchTerm();
		});
		watch(rootContext.modelValue, async () => {
			if (!rootContext.isUserInputted.value && rootContext.resetSearchTermOnSelect.value) resetSearchTerm();
		}, {
			immediate: true,
			deep: true
		});
		watch(rootContext.filterState, () => {
			if (!rootContext.isVirtual.value) listboxContext.highlightFirstItem();
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
//#region src/Combobox/ComboboxInput.vue
var ComboboxInput_default = ComboboxInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxInput_default };
//# sourceMappingURL=ComboboxInput.js.map