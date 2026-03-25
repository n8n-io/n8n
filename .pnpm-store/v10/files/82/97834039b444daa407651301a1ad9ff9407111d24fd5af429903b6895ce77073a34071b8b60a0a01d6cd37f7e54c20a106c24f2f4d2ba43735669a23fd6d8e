const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_Listbox_ListboxItem = require('../Listbox/ListboxItem.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const require_Combobox_ComboboxGroup = require('./ComboboxGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxItem.vue?vue&type=script&setup=true&lang.ts
var ComboboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxItem",
	props: {
		textValue: {
			type: String,
			required: false
		},
		value: {
			type: null,
			required: true
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
			required: false
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const id = require_shared_useId.useId(void 0, "reka-combobox-item");
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const groupContext = require_Combobox_ComboboxGroup.injectComboboxGroupContext(null);
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		if (props.value === "") throw new Error("A <ComboboxItem /> must have a value prop that is not an empty string. This is because the Combobox value can be set to an empty string to clear the selection and show the placeholder.");
		const isRender = (0, vue.computed)(() => {
			if (rootContext.isVirtual.value || rootContext.ignoreFilter.value || !rootContext.filterSearch.value) return true;
			else {
				const filteredCurrentItem = rootContext.filterState.value.items.get(id);
				if (filteredCurrentItem === void 0) return true;
				return filteredCurrentItem > 0;
			}
		});
		(0, vue.onMounted)(() => {
			rootContext.allItems.value.set(id, props.textValue || currentElement.value.textContent || currentElement.value.innerText);
			const groupId = groupContext?.id;
			if (groupId) if (!rootContext.allGroups.value.has(groupId)) rootContext.allGroups.value.set(groupId, new Set([id]));
			else rootContext.allGroups.value.get(groupId)?.add(id);
		});
		(0, vue.onUnmounted)(() => {
			rootContext.allItems.value.delete(id);
		});
		return (_ctx, _cache) => {
			return isRender.value ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxItem.ListboxItem_default), (0, vue.mergeProps)({ key: 0 }, props, {
				id: (0, vue.unref)(id),
				ref_key: "primitiveElement",
				ref: primitiveElement,
				disabled: (0, vue.unref)(rootContext).disabled.value || _ctx.disabled,
				onSelect: _cache[0] || (_cache[0] = (event) => {
					emits("select", event);
					if (event.defaultPrevented) return;
					if (!(0, vue.unref)(rootContext).multiple.value && !_ctx.disabled && !(0, vue.unref)(rootContext).disabled.value) {
						event.preventDefault();
						(0, vue.unref)(rootContext).onOpenChange(false);
						(0, vue.unref)(rootContext).modelValue.value = props.value;
					}
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(_ctx.value), 1)])]),
				_: 3
			}, 16, ["id", "disabled"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxItem.vue
var ComboboxItem_default = ComboboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxItem_default', {
  enumerable: true,
  get: function () {
    return ComboboxItem_default;
  }
});
//# sourceMappingURL=ComboboxItem.cjs.map