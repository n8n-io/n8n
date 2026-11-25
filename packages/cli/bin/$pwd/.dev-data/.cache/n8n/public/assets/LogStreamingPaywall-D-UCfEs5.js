import { $d as init_runtime_core_esm_bundler, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Vd as createCommentVNode, Xf as unref, _f as resolveDirective, ff as openBlock, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Ru as usePageRedirectionHelper, jN as useI18n, tM as N8nInfoTip_default, xM as N8nEmptyState_default } from "./app-D5flEmb-.js";
//#region src/features/integrations/logStreaming.ee/components/LogStreamingPaywall.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mb-l"
};
var _hoisted_2 = { "data-test-id": "action-box-unlicensed" };
//#endregion
//#region src/features/integrations/logStreaming.ee/components/LogStreamingPaywall.vue
var LogStreamingPaywall_default = /* @__PURE__ */ defineComponent({
	__name: "LogStreamingPaywall",
	setup(__props) {
		const i18n = useI18n();
		const pageRedirectHelper = usePageRedirectionHelper();
		function goToUpgrade() {
			pageRedirectHelper.goToUpgrade("log-streaming", "upgrade-log-streaming");
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", null, [unref(i18n).baseText("settings.log-streaming.infoText") ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nInfoTip_default), {
				theme: "info",
				type: "note"
			}, {
				default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("settings.log-streaming.infoText")]])]),
				_: 1
			})])) : createCommentVNode("", true), createBaseVNode("div", _hoisted_2, [createVNode(unref(N8nEmptyState_default), {
				description: unref(i18n).baseText("settings.log-streaming.actionBox.description"),
				"button-text": unref(i18n).baseText("settings.log-streaming.actionBox.button"),
				"onClick:button": goToUpgrade
			}, {
				heading: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("settings.log-streaming.actionBox.title")]])]),
				_: 1
			}, 8, ["description", "button-text"])])]);
		};
	}
});
//#endregion
export { LogStreamingPaywall_default as t };
