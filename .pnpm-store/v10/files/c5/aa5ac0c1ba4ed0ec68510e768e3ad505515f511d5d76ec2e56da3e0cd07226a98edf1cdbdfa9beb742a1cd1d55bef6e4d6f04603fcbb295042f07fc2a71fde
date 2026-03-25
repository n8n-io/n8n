const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const require_Toast_ToastProvider = require('./ToastProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Toast/ToastAnnounce.vue?vue&type=script&setup=true&lang.ts
var ToastAnnounce_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToastAnnounce",
	setup(__props) {
		const providerContext = require_Toast_ToastProvider.injectToastProviderContext();
		const isAnnounced = (0, __vueuse_shared.useTimeout)(1e3);
		const renderAnnounceText = (0, vue.ref)(false);
		(0, __vueuse_core.useRafFn)(() => {
			renderAnnounceText.value = true;
		});
		return (_ctx, _cache) => {
			return (0, vue.unref)(isAnnounced) || renderAnnounceText.value ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), { key: 0 }, {
				default: (0, vue.withCtx)(() => [(0, vue.createTextVNode)((0, vue.toDisplayString)((0, vue.unref)(providerContext).label.value) + " ", 1), (0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			})) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Toast/ToastAnnounce.vue
var ToastAnnounce_default = ToastAnnounce_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastAnnounce_default', {
  enumerable: true,
  get: function () {
    return ToastAnnounce_default;
  }
});
//# sourceMappingURL=ToastAnnounce.cjs.map