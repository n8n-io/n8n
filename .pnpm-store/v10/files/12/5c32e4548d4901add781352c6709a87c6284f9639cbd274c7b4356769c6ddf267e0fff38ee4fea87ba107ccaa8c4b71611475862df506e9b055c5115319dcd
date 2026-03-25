const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Listbox_ListboxGroup = require('../Listbox/ListboxGroup.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxGroup.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxGroupContext, provideComboboxGroupContext] = require_shared_createContext.createContext("ComboboxGroup");
var ComboboxGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxGroup",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const id = require_shared_useId.useId(void 0, "reka-combobox-group");
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const isRender = (0, vue.computed)(() => rootContext.ignoreFilter.value ? true : !rootContext.filterSearch.value ? true : rootContext.filterState.value.groups.has(id));
		const context = provideComboboxGroupContext({
			id,
			labelId: ""
		});
		(0, vue.onMounted)(() => {
			if (!rootContext.allGroups.value.has(id)) rootContext.allGroups.value.set(id, /* @__PURE__ */ new Set());
		});
		(0, vue.onUnmounted)(() => {
			rootContext.allGroups.value.delete(id);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxGroup.ListboxGroup_default), (0, vue.mergeProps)({
				id: (0, vue.unref)(id),
				"aria-labelledby": (0, vue.unref)(context).labelId
			}, props, { hidden: isRender.value ? void 0 : true }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"id",
				"aria-labelledby",
				"hidden"
			]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxGroup.vue
var ComboboxGroup_default = ComboboxGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxGroup_default', {
  enumerable: true,
  get: function () {
    return ComboboxGroup_default;
  }
});
Object.defineProperty(exports, 'injectComboboxGroupContext', {
  enumerable: true,
  get: function () {
    return injectComboboxGroupContext;
  }
});
//# sourceMappingURL=ComboboxGroup.cjs.map