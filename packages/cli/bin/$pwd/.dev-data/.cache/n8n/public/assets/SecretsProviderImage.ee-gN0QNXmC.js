import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Hd as createElementBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { a as hashicorp_default, i as aws_secrets_manager_default, n as gcp_secrets_manager_default, o as doppler_default, r as azure_key_vault_default, s as infisical_default, t as one_password_default } from "./one-password-BkElZLbo.js";
//#region src/features/integrations/secretsProviders.ee/components/SecretsProviderImage.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["src", "alt"];
//#endregion
//#region src/features/integrations/secretsProviders.ee/components/SecretsProviderImage.ee.vue
var SecretsProviderImage_ee_default = /* @__PURE__ */ defineComponent({
	__name: "SecretsProviderImage.ee",
	props: { provider: {} },
	setup(__props) {
		const image = computed(() => {
			const providerName = __props.provider.type;
			return {
				doppler: doppler_default,
				infisical: infisical_default,
				vault: hashicorp_default
			}[providerName];
		});
		return (_ctx, _cache) => {
			return __props.provider.type === "awsSecretsManager" ? (openBlock(), createBlock(unref(aws_secrets_manager_default), { key: 0 })) : __props.provider.type === "azureKeyVault" ? (openBlock(), createBlock(unref(azure_key_vault_default), { key: 1 })) : __props.provider.type === "gcpSecretsManager" ? (openBlock(), createBlock(unref(gcp_secrets_manager_default), { key: 2 })) : __props.provider.type === "onePassword" ? (openBlock(), createBlock(unref(one_password_default), { key: 3 })) : (openBlock(), createElementBlock("img", {
				key: 4,
				src: image.value,
				alt: __props.provider.displayName,
				width: "28",
				height: "28"
			}, null, 8, _hoisted_1));
		};
	}
});
//#endregion
export { SecretsProviderImage_ee_default as t };
