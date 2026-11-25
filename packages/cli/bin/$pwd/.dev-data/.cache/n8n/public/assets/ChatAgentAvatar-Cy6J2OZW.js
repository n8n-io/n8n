import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Hc as CredentialIcon_default, Ia as workflowAgentDefaultIcon, Ma as personalAgentDefaultIcon, Mp as useCredentialsStore, SN as _plugin_vue_export_helper_default, fN as N8nTooltip_default, jN as useI18n, ka as isLlmProviderModel, pT as PROVIDER_CREDENTIAL_TYPE_MAP, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/ai/chatHub/components/ChatAgentAvatar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ChatAgentAvatar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatAgentAvatar",
	props: {
		agent: {},
		size: {},
		tooltip: { type: Boolean }
	},
	setup(__props) {
		const credentialsStore = useCredentialsStore();
		const isCredentialsIconReady = computed(() => credentialsStore.allCredentialTypes.length > 0);
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				"show-after": 100,
				placement: "left",
				disabled: !__props.tooltip
			}, {
				content: withCtx(() => [createTextVNode(toDisplayString(__props.agent?.name || unref(i18n).baseText("chatHub.agent.unavailableAgent")), 1)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass([_ctx.$style.container, _ctx.$attrs.class]) }, [__props.agent?.icon?.type === "emoji" ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass([_ctx.$style.emoji, _ctx.$style[__props.size]])
				}, toDisplayString(__props.agent.icon.value), 3)) : !__props.agent || !unref(isLlmProviderModel)(__props.agent.model) ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					color: __props.size === "sm" ? "text-base" : "text-light",
					class: normalizeClass([_ctx.$style.n8nIcon, _ctx.$style[__props.size]]),
					icon: __props.agent?.icon?.value ?? (__props.agent?.model.provider === "n8n" ? unref(workflowAgentDefaultIcon) : unref(personalAgentDefaultIcon)).value,
					size: __props.size === "xl" ? "xxlarge" : __props.size === "lg" ? "xxlarge" : __props.size === "sm" ? "large" : "xlarge"
				}, null, 8, [
					"color",
					"class",
					"icon",
					"size"
				])) : (openBlock(), createBlock(CredentialIcon_default, {
					key: 2,
					class: normalizeClass([_ctx.$style.credentialsIcon, { [_ctx.$style.isReady]: isCredentialsIconReady.value }]),
					"credential-type-name": unref(PROVIDER_CREDENTIAL_TYPE_MAP)[__props.agent.model.provider],
					size: __props.size === "xl" ? 40 : __props.size === "sm" ? 16 : __props.size === "lg" ? 40 : 20
				}, null, 8, [
					"class",
					"credential-type-name",
					"size"
				]))], 2)]),
				_: 1
			}, 8, ["disabled"]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1f340_1",
	n8nIcon: "_n8nIcon_1f340_8",
	lg: "_lg_1f340_11",
	xl: "_xl_1f340_18",
	emoji: "_emoji_1f340_23",
	sm: "_sm_1f340_28",
	md: "_md_1f340_32",
	credentialsIcon: "_credentialsIcon_1f340_48",
	isReady: "_isReady_1f340_51"
} }]]);
//#endregion
export { ChatAgentAvatar_default as t };
