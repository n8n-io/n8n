const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectProvider.vue?vue&type=script&setup=true&lang.ts
var SelectProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SelectProvider",
	props: { context: {
		type: Object,
		required: true
	} },
	setup(__props) {
		const props = __props;
		require_Select_SelectRoot.provideSelectRootContext(props.context);
		require_Select_SelectContentImpl.provideSelectContentContext(require_Select_SelectContentImpl.SelectContentDefaultContextValue);
		return (_ctx, _cache) => {
			return (0, vue.renderSlot)(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Select/SelectProvider.vue
var SelectProvider_default = SelectProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectProvider_default', {
  enumerable: true,
  get: function () {
    return SelectProvider_default;
  }
});
//# sourceMappingURL=SelectProvider.cjs.map