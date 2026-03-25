import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { injectToastProviderContext } from "./ToastProvider.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toast/FocusProxy.vue?vue&type=script&setup=true&lang.ts
var FocusProxy_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "FocusProxy",
	emits: ["focusFromOutsideViewport"],
	setup(__props, { emit: __emit }) {
		const emits = __emit;
		const providerContext = injectToastProviderContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(VisuallyHidden_default), {
				"aria-hidden": "true",
				tabindex: "0",
				style: { "position": "fixed" },
				onFocus: _cache[0] || (_cache[0] = (event) => {
					const prevFocusedElement = event.relatedTarget;
					const isFocusFromOutsideViewport = !unref(providerContext).viewport.value?.contains(prevFocusedElement);
					if (isFocusFromOutsideViewport) emits("focusFromOutsideViewport");
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toast/FocusProxy.vue
var FocusProxy_default = FocusProxy_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { FocusProxy_default };
//# sourceMappingURL=FocusProxy.js.map