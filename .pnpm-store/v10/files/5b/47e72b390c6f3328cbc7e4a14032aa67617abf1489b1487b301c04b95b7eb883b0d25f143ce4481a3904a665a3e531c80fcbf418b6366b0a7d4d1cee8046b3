const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ConfigProvider/ConfigProvider.vue?vue&type=script&setup=true&lang.ts
const [injectConfigProviderContext, provideConfigProviderContext] = require_shared_createContext.createContext("ConfigProvider");
var ConfigProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { dir, locale, scrollBody, nonce } = (0, vue.toRefs)(props);
		provideConfigProviderContext({
			dir,
			locale,
			scrollBody,
			nonce,
			useId: props.useId
		});
		return (_ctx, _cache) => {
			return (0, vue.renderSlot)(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/ConfigProvider/ConfigProvider.vue
var ConfigProvider_default = ConfigProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ConfigProvider_default', {
  enumerable: true,
  get: function () {
    return ConfigProvider_default;
  }
});
Object.defineProperty(exports, 'injectConfigProviderContext', {
  enumerable: true,
  get: function () {
    return injectConfigProviderContext;
  }
});
//# sourceMappingURL=ConfigProvider.cjs.map