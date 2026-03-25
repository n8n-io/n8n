import { createContext } from "../shared/createContext.js";
import { defineComponent, renderSlot, toRefs } from "vue";

//#region src/ConfigProvider/ConfigProvider.vue?vue&type=script&setup=true&lang.ts
const [injectConfigProviderContext, provideConfigProviderContext] = createContext("ConfigProvider");
var ConfigProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ConfigProvider",
	props: {
		dir: {
			type: String,
			required: false,
			default: "ltr"
		},
		locale: {
			type: String,
			required: false,
			default: "en"
		},
		scrollBody: {
			type: [Boolean, Object],
			required: false,
			default: true
		},
		nonce: {
			type: String,
			required: false,
			default: void 0
		},
		useId: {
			type: Function,
			required: false,
			default: void 0
		}
	},
	setup(__props) {
		const props = __props;
		const { dir, locale, scrollBody, nonce } = toRefs(props);
		provideConfigProviderContext({
			dir,
			locale,
			scrollBody,
			nonce,
			useId: props.useId
		});
		return (_ctx, _cache) => {
			return renderSlot(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/ConfigProvider/ConfigProvider.vue
var ConfigProvider_default = ConfigProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ConfigProvider_default, injectConfigProviderContext };
//# sourceMappingURL=ConfigProvider.js.map