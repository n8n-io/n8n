import { $d as init_runtime_core_esm_bundler, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Kd as useDocumentTitle, SM as N8nHeading_default, jN as useI18n } from "./app-D5flEmb-.js";
import { t as LogStreamingPaywall_default } from "./LogStreamingPaywall-D-UCfEs5.js";
//#region src/features/integrations/logStreaming.ee/views/LogStreamingPlaceholderView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "mb-2xl" };
//#endregion
//#region src/features/integrations/logStreaming.ee/views/LogStreamingPlaceholderView.vue
var LogStreamingPlaceholderView_default = /* @__PURE__ */ defineComponent({
	__name: "LogStreamingPlaceholderView",
	setup(__props) {
		const i18n = useI18n();
		const documentTitle = useDocumentTitle();
		onMounted(() => {
			documentTitle.set(i18n.baseText("settings.log-streaming.heading"));
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.log-streaming.heading")), 1)]),
				_: 1
			})]), createVNode(LogStreamingPaywall_default)]);
		};
	}
});
//#endregion
export { LogStreamingPlaceholderView_default as default };
