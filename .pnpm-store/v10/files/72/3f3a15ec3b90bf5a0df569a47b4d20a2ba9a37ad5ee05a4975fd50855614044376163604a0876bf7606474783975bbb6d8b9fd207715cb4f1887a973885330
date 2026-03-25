const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const require_Toast_ToastProvider = require('./ToastProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toast/FocusProxy.vue?vue&type=script&setup=true&lang.ts
var FocusProxy_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "FocusProxy",
	emits: ["focusFromOutsideViewport"],
	setup(__props, { emit: __emit }) {
		const emits = __emit;
		const providerContext = require_Toast_ToastProvider.injectToastProviderContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), {
				"aria-hidden": "true",
				tabindex: "0",
				style: { "position": "fixed" },
				onFocus: _cache[0] || (_cache[0] = (event) => {
					const prevFocusedElement = event.relatedTarget;
					const isFocusFromOutsideViewport = !(0, vue.unref)(providerContext).viewport.value?.contains(prevFocusedElement);
					if (isFocusFromOutsideViewport) emits("focusFromOutsideViewport");
				})
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toast/FocusProxy.vue
var FocusProxy_default = FocusProxy_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'FocusProxy_default', {
  enumerable: true,
  get: function () {
    return FocusProxy_default;
  }
});
//# sourceMappingURL=FocusProxy.cjs.map