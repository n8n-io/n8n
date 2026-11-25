import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Vd as createCommentVNode, Xf as unref, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { Hc as CredentialIcon_default, UD as AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/agents/model-providers.ts
/**
* Presentation only. The provider's credential types live in
* `AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES` (`@n8n/api-types`) so the backend's
* n8n Connect gate and this picker cannot drift apart.
*/
var AGENT_MODEL_PROVIDER_DEFINITIONS = {
	openai: { displayName: "OpenAI" },
	anthropic: { displayName: "Anthropic" },
	google: { displayName: "Google" },
	"google-vertex": { displayName: "Google Vertex AI" },
	"azure-openai": { displayName: "Microsoft Foundry" },
	"aws-bedrock": {
		displayName: "AWS Bedrock",
		isAggregator: true
	},
	xai: { displayName: "xAI" },
	groq: { displayName: "Groq" },
	openrouter: {
		displayName: "OpenRouter",
		isAggregator: true
	},
	deepseek: { displayName: "DeepSeek" },
	cohere: { displayName: "Cohere" },
	mistral: { displayName: "Mistral" },
	vercel: {
		displayName: "Vercel AI Gateway",
		isAggregator: true
	},
	nvidia: { displayName: "NVIDIA" },
	moonshotai: { displayName: "Moonshot" },
	alibaba: { displayName: "Qwen Cloud" },
	minimax: { displayName: "MiniMax" }
};
function getProviderCredentialTypes(provider) {
	return AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES[provider];
}
//#endregion
//#region src/features/agents/components/model-selector/ModelSelectorTriggerIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/model-selector/ModelSelectorTriggerIcon.vue
var ModelSelectorTriggerIcon_default = /* @__PURE__ */ defineComponent({
	__name: "ModelSelectorTriggerIcon",
	props: { credentialTypeName: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.credentialTypeName ? (openBlock(), createBlock(CredentialIcon_default, {
				key: 0,
				"credential-type-name": __props.credentialTypeName,
				size: 18
			}, null, 8, ["credential-type-name"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				icon: "bot",
				size: "medium"
			}));
		};
	}
});
//#endregion
//#region src/features/agents/components/model-selector/ModelSelectorItemLeadingIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/model-selector/ModelSelectorItemLeadingIcon.vue
var ModelSelectorItemLeadingIcon_default = /* @__PURE__ */ defineComponent({
	__name: "ModelSelectorItemLeadingIcon",
	props: { item: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.item.data?.leadingIcon ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				icon: __props.item.data.leadingIcon,
				size: "large"
			}, null, 8, ["icon"])) : __props.item.data?.credentialType ? (openBlock(), createBlock(CredentialIcon_default, {
				key: 1,
				"credential-type-name": __props.item.data.credentialType,
				size: 16
			}, null, 8, ["credential-type-name"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/agents/components/model-selector/menuItemId.ts
/**
* Model selector dropdown item ids encode `provider::action::value`, e.g.
* "openai::model::gpt-5-mini" or "anthropic::credential::abc123".
*/
function buildMenuItemId(provider, action, value) {
	return `${provider}::${action}::${encodeURIComponent(value)}`;
}
function parseMenuItemId(id) {
	const [provider, action, rawValue] = id.split("::");
	if (!provider || !action || !rawValue) return null;
	return {
		provider,
		action,
		value: decodeURIComponent(rawValue)
	};
}
//#endregion
export { AGENT_MODEL_PROVIDER_DEFINITIONS as a, ModelSelectorTriggerIcon_default as i, parseMenuItemId as n, getProviderCredentialTypes as o, ModelSelectorItemLeadingIcon_default as r, buildMenuItemId as t };
