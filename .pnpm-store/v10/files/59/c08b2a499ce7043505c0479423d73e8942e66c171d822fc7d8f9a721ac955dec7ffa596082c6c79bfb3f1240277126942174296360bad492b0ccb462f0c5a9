import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { injectToastProviderContext } from "./ToastProvider.js";
import { createBlock, createCommentVNode, createTextVNode, defineComponent, openBlock, ref, renderSlot, toDisplayString, unref, withCtx } from "vue";
import { useRafFn } from "@vueuse/core";
import { useTimeout } from "@vueuse/shared";

//#region src/Toast/ToastAnnounce.vue?vue&type=script&setup=true&lang.ts
var ToastAnnounce_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToastAnnounce",
	setup(__props) {
		const providerContext = injectToastProviderContext();
		const isAnnounced = useTimeout(1e3);
		const renderAnnounceText = ref(false);
		useRafFn(() => {
			renderAnnounceText.value = true;
		});
		return (_ctx, _cache) => {
			return unref(isAnnounced) || renderAnnounceText.value ? (openBlock(), createBlock(unref(VisuallyHidden_default), { key: 0 }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(providerContext).label.value) + " ", 1), renderSlot(_ctx.$slots, "default")]),
				_: 3
			})) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Toast/ToastAnnounce.vue
var ToastAnnounce_default = ToastAnnounce_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToastAnnounce_default };
//# sourceMappingURL=ToastAnnounce.js.map