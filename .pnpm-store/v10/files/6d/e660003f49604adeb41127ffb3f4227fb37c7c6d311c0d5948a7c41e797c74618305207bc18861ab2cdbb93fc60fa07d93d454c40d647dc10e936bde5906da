const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxCancel.vue?vue&type=script&setup=true&lang.ts
var ComboboxCancel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxCancel",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		function handleClick() {
			rootContext.filterSearch.value = "";
			if (rootContext.inputElement.value) {
				rootContext.inputElement.value.value = "";
				rootContext.inputElement.value.focus();
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ type: _ctx.as === "button" ? "button" : void 0 }, props, {
				tabindex: "-1",
				onClick: handleClick
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxCancel.vue
var ComboboxCancel_default = ComboboxCancel_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxCancel_default', {
  enumerable: true,
  get: function () {
    return ComboboxCancel_default;
  }
});
//# sourceMappingURL=ComboboxCancel.cjs.map