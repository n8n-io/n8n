import { provideSelectRootContext } from "./SelectRoot.js";
import { SelectContentDefaultContextValue, provideSelectContentContext } from "./SelectContentImpl.js";
import { defineComponent, renderSlot } from "vue";

//#region src/Select/SelectProvider.vue?vue&type=script&setup=true&lang.ts
var SelectProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "SelectProvider",
	props: { context: {
		type: Object,
		required: true
	} },
	setup(__props) {
		const props = __props;
		provideSelectRootContext(props.context);
		provideSelectContentContext(SelectContentDefaultContextValue);
		return (_ctx, _cache) => {
			return renderSlot(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Select/SelectProvider.vue
var SelectProvider_default = SelectProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectProvider_default };
//# sourceMappingURL=SelectProvider.js.map