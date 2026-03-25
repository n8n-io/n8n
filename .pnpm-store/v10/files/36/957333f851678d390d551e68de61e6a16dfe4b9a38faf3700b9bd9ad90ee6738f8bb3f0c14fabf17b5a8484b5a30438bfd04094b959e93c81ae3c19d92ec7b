const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Listbox_ListboxVirtualizer = require('../Listbox/ListboxVirtualizer.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxVirtualizer.vue?vue&type=script&setup=true&lang.ts
var ComboboxVirtualizer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxVirtualizer",
	props: {
		options: {
			type: Array,
			required: true
		},
		overscan: {
			type: Number,
			required: false
		},
		estimateSize: {
			type: Number,
			required: false
		},
		textContent: {
			type: Function,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		rootContext.isVirtual.value = true;
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Listbox_ListboxVirtualizer.ListboxVirtualizer_default, (0, vue.normalizeProps)((0, vue.guardReactiveProps)(props)), {
				default: (0, vue.withCtx)((slotProps) => [(0, vue.renderSlot)(_ctx.$slots, "default", (0, vue.normalizeProps)((0, vue.guardReactiveProps)(slotProps)))]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxVirtualizer.vue
var ComboboxVirtualizer_default = ComboboxVirtualizer_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxVirtualizer_default', {
  enumerable: true,
  get: function () {
    return ComboboxVirtualizer_default;
  }
});
//# sourceMappingURL=ComboboxVirtualizer.cjs.map