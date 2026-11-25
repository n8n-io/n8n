import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Nf as init_reactivity_esm_bundler, Of as withDirectives, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _f as resolveDirective, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Ef as removePreviewToken, LM as N8nCallout_default, Op as stripToolSuffix, SN as _plugin_vue_export_helper_default, kp as useAiGatewayStore, uf as useNodeTypesStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/credentials/quickConnect/components/QuickConnectBanner.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var QuickConnectBanner_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "QuickConnectBanner",
	props: {
		text: {},
		disclaimer: {}
	},
	setup(__props) {
		const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
		const disclaimerHtml = computed(() => {
			if (!__props.disclaimer) return "";
			const label = escapeHtml(__props.disclaimer.linkLabel ?? "here");
			const link = `<a href="${escapeHtml(__props.disclaimer.linkUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
			return __props.disclaimer.text.split("{link}").map(escapeHtml).join(link);
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return __props.text || __props.disclaimer ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.wrapper),
				"data-test-id": "quick-connect-banner"
			}, [__props.text ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "secondary",
				iconless: ""
			}, {
				default: withCtx(() => [withDirectives(createBaseVNode("div", null, null, 512), [[_directive_n8n_html, __props.text]])]),
				_: 1
			})) : createCommentVNode("", true), __props.disclaimer ? withDirectives((openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.disclaimer),
				"data-test-id": "quick-connect-banner-disclaimer"
			}, null, 2)), [[_directive_n8n_html, disclaimerHtml.value]]) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_spbkp_1",
	disclaimer: "_disclaimer_spbkp_7"
} }]]);
//#endregion
//#region src/features/credentials/gatewayCreditsPromotion/useGatewayCreditsPromotion.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var isActive = (promotion, now) => !!promotion?.text?.trim() && (!promotion.startsAt || now >= Date.parse(promotion.startsAt)) && (!promotion.endsAt || now < Date.parse(promotion.endsAt));
/**
* Gateway credits promotion of a node. A promotion in the Gateway config takes
* precedence over the community node's Strapi record.
*
* The credential modal passes both types: the node that opened it, if any, and
* the credential. Without a matching node, only a community node's Strapi
* promotion can match by credential type.
*/
function useGatewayCreditsPromotion({ nodeType, credentialType }) {
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const aiGatewayStore = useAiGatewayStore();
	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);
	if (isEnabled.value) aiGatewayStore.fetchConfig();
	if (isEnabled.value && credentialType !== void 0 && nodeTypesStore.vettedCommunityNodeTypes.size === 0) nodeTypesStore.fetchCommunityNodePreviews();
	const nodeUsesCredential = (nodeTypeName, credentialTypeName) => !!nodeTypesStore.getNodeType(nodeTypeName)?.credentials?.some(({ name }) => name === credentialTypeName);
	const gatewayPromotionForNode = (nodeTypeName, now) => aiGatewayStore.config?.promotions?.find(({ nodes, ...promotion }) => isActive(promotion, now) && (nodes.includes(nodeTypeName) || nodes.includes(stripToolSuffix(nodeTypeName))));
	const communityPromotionForNode = (nodeTypeName, now) => {
		const promotion = nodeTypesStore.communityNodeType(nodeTypeName)?.gatewayCreditsPromotion;
		return isActive(promotion, now) ? promotion : void 0;
	};
	const communityPromotionForCredential = (credentialTypeName, now) => {
		if (!aiGatewayStore.isCredentialTypeSupported(credentialTypeName)) return void 0;
		return [...nodeTypesStore.vettedCommunityNodeTypes.values()].find(({ name, gatewayCreditsPromotion }) => isActive(gatewayCreditsPromotion, now) && aiGatewayStore.isNodeSupported(name) && nodeUsesCredential(name, credentialTypeName))?.gatewayCreditsPromotion;
	};
	const promotionForNode = (nodeTypeName, now) => {
		if (!aiGatewayStore.isNodeSupported(nodeTypeName)) return void 0;
		return gatewayPromotionForNode(nodeTypeName, now) ?? communityPromotionForNode(nodeTypeName, now);
	};
	return { promotionText: computed(() => {
		if (!isEnabled.value) return void 0;
		const now = Date.now();
		const rawNodeTypeName = toValue(nodeType);
		const nodeTypeName = rawNodeTypeName && removePreviewToken(rawNodeTypeName);
		const credentialTypeName = toValue(credentialType);
		if (nodeTypeName && (!credentialTypeName || nodeUsesCredential(nodeTypeName, credentialTypeName))) return promotionForNode(nodeTypeName, now)?.text;
		return credentialTypeName ? communityPromotionForCredential(credentialTypeName, now)?.text : void 0;
	}) };
}
//#endregion
//#region src/features/credentials/gatewayCreditsPromotion/GatewayCreditsPromotion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/credentials/gatewayCreditsPromotion/GatewayCreditsPromotion.vue
var GatewayCreditsPromotion_default = /* @__PURE__ */ defineComponent({
	__name: "GatewayCreditsPromotion",
	props: { text: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCallout_default), {
				theme: "secondary",
				iconless: "",
				"data-test-id": "gateway-credits-promotion"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.text), 1)]),
				_: 1
			});
		};
	}
});
//#endregion
export { useGatewayCreditsPromotion as n, QuickConnectBanner_default as r, GatewayCreditsPromotion_default as t };
