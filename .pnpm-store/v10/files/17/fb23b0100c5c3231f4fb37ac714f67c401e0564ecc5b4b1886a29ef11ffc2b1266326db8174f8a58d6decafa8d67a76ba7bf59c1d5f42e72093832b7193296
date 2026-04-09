const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Menu_MenuRoot = require('../Menu/MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('../Menu/MenuContentImpl.cjs');
const require_Menu_MenuSub = require('../Menu/MenuSub.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DropdownMenu/DropdownMenuFilter.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuFilter_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DropdownMenuFilter",
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
		const rootContext = require_Menu_MenuRoot.injectMenuRootContext();
		const contentContext = require_Menu_MenuContentImpl.injectMenuContentContext();
		const subContext = require_Menu_MenuSub.injectMenuSubContext(null);
		(0, vue.watch)(modelValue, (v) => {
			contentContext.searchRef.value = v ?? "";
		}, { immediate: true });
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const disabled = (0, vue.computed)(() => props.disabled || false);
		const activedescendant = (0, vue.ref)();
		(0, vue.watchSyncEffect)(() => activedescendant.value = contentContext.highlightedElement.value?.id);
		(0, vue.onMounted)(() => {
			contentContext.onFilterElementChange(currentElement.value);
			setTimeout(() => {
				if (props.autoFocus) {
					const isSubmenu = !!subContext;
					if (!isSubmenu || rootContext.isUsingKeyboardRef.value) currentElement.value?.focus();
				}
			}, 1);
		});
		(0, vue.onUnmounted)(() => {
			contentContext.onFilterElementChange(void 0);
			contentContext.searchRef.value = "";
		});
		function handleInput(event) {
			if (disabled.value) return;
			const target = event.target;
			modelValue.value = target.value;
			contentContext.searchRef.value = target.value;
		}
		function handleKeyDown(event) {
			if (disabled.value) return;
			if ([
				"ArrowDown",
				"ArrowUp",
				"Home",
				"End"
			].includes(event.key)) {
				event.preventDefault();
				contentContext.onKeydownNavigation(event);
			} else if (event.key === "Enter") {
				event.preventDefault();
				contentContext.onKeydownEnter(event);
			} else if (event.key === "Escape" && modelValue.value) {
				event.stopPropagation();
				modelValue.value = "";
				contentContext.searchRef.value = "";
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				value: (0, vue.unref)(modelValue),
				disabled: disabled.value ? "" : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ? true : void 0,
				"aria-activedescendant": activedescendant.value,
				type: "text",
				role: "searchbox",
				onInput: handleInput,
				onKeydown: handleKeyDown
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
				"aria-activedescendant"
			]);
		};
	}
});

//#endregion
//#region src/DropdownMenu/DropdownMenuFilter.vue
var DropdownMenuFilter_default = DropdownMenuFilter_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DropdownMenuFilter_default', {
  enumerable: true,
  get: function () {
    return DropdownMenuFilter_default;
  }
});
//# sourceMappingURL=DropdownMenuFilter.cjs.map