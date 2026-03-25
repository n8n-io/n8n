const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Listbox_ListboxRoot = require('./ListboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Listbox/ListboxFilter.vue?vue&type=script&setup=true&lang.ts
var ListboxFilter_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ListboxFilter",
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
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: "",
			passive: props.modelValue === void 0
		});
		const rootContext = require_Listbox_ListboxRoot.injectListboxRootContext();
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const disabled = (0, vue.computed)(() => props.disabled || rootContext.disabled.value || false);
		const activedescendant = (0, vue.ref)();
		(0, vue.watchSyncEffect)(() => activedescendant.value = rootContext.highlightedElement.value?.id);
		(0, vue.onMounted)(() => {
			rootContext.focusable.value = false;
			setTimeout(() => {
				if (props.autoFocus) currentElement.value?.focus();
			}, 1);
		});
		(0, vue.onUnmounted)(() => {
			rootContext.focusable.value = true;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				value: (0, vue.unref)(modelValue),
				disabled: disabled.value ? "" : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ?? void 0,
				"aria-activedescendant": activedescendant.value,
				type: "text",
				onKeydown: [(0, vue.withKeys)((0, vue.withModifiers)((0, vue.unref)(rootContext).onKeydownNavigation, ["prevent"]), [
					"down",
					"up",
					"home",
					"end"
				]), (0, vue.withKeys)((0, vue.unref)(rootContext).onKeydownEnter, ["enter"])],
				onInput: _cache[0] || (_cache[0] = (event) => {
					modelValue.value = event.target.value;
					(0, vue.unref)(rootContext).highlightFirstItem();
				}),
				onCompositionstart: (0, vue.unref)(rootContext).onCompositionStart,
				onCompositionend: (0, vue.unref)(rootContext).onCompositionEnd
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"value",
				"disabled",
				"data-disabled",
				"aria-disabled",
				"aria-activedescendant",
				"onKeydown",
				"onCompositionstart",
				"onCompositionend"
			]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxFilter.vue
var ListboxFilter_default = ListboxFilter_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ListboxFilter_default', {
  enumerable: true,
  get: function () {
    return ListboxFilter_default;
  }
});
//# sourceMappingURL=ListboxFilter.cjs.map