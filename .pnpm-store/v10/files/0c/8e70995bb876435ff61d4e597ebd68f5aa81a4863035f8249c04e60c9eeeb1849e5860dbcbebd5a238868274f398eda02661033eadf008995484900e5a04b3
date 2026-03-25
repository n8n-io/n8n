const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Listbox_ListboxRoot = require('../Listbox/ListboxRoot.cjs');
const require_Listbox_ListboxFilter = require('../Listbox/ListboxFilter.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Combobox/ComboboxInput.vue?vue&type=script&setup=true&lang.ts
var ComboboxInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const listboxContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, { passive: props.modelValue === void 0 });
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
			(0, vue.nextTick)(() => {
				modelValue.value = modelValue.value;
			});
		}
		rootContext.onResetSearchTerm(() => {
			resetSearchTerm();
		});
		(0, vue.watch)(rootContext.modelValue, async () => {
			if (!rootContext.isUserInputted.value && rootContext.resetSearchTermOnSelect.value) resetSearchTerm();
		}, {
			immediate: true,
			deep: true
		});
		(0, vue.watch)(rootContext.filterState, () => {
			if (!rootContext.isVirtual.value) listboxContext.highlightFirstItem();
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
//#region src/Combobox/ComboboxInput.vue
var ComboboxInput_default = ComboboxInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxInput_default', {
  enumerable: true,
  get: function () {
    return ComboboxInput_default;
  }
});
//# sourceMappingURL=ComboboxInput.cjs.map