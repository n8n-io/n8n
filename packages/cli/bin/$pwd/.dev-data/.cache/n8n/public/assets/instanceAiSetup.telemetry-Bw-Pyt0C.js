import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Tf as watch, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, PE as deriveInstanceAiSetupState, hC as useTelemetry, wy as TELEMETRY_EVENT } from "./app-D5flEmb-.js";
import { i as INSTANCE_AI_SEARCH_PROVIDERS, r as INSTANCE_AI_MODEL_PROVIDERS } from "./useInstanceAiConfiguration-cCPtcGs6.js";
//#region src/features/ai/instanceAi/instanceAiSetup.telemetry.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Configuration state of each setup component, from the same
* `deriveInstanceAiSetupState` derivation the backend snapshot uses. Provider
* names for env-var configuration are not exposed to the frontend, so they
* report as null here.
*/
function buildSetupSnapshot(settings, modelCredentials, serviceCredentials) {
	const state = deriveInstanceAiSetupState(settings);
	const modelCredentialType = modelCredentials.find((credential) => credential.id === settings.modelCredentialId)?.type;
	const modelProvider = state.modelSource === "ui" ? INSTANCE_AI_MODEL_PROVIDERS.find((provider) => provider.credentialType === modelCredentialType)?.id ?? null : null;
	const searchCredentialType = serviceCredentials.find((credential) => credential.id === settings.searchCredentialId)?.type;
	const searchProvider = state.webSearchSource === "ui" ? INSTANCE_AI_SEARCH_PROVIDERS.find((provider) => provider.credentialType === searchCredentialType)?.id ?? null : state.webSearchSource === "env" ? settings.envManaged?.search.apiKey ? "brave" : settings.envManaged?.search.url ? "searxng" : null : null;
	return {
		model_source: state.modelSource,
		model_provider: modelProvider,
		model_name: state.modelSource === "none" ? null : settings.modelName,
		sandbox_source: state.sandboxSource,
		sandbox_type: state.sandboxType,
		web_search_source: state.webSearchSource,
		web_search_provider: searchProvider
	};
}
/**
* Reports one "User viewed AI Assistant setup page" per view of a setup
* surface, once the settings load so the snapshot reflects real state.
* Managed deployments (cloud, proxy) never emit: there is nothing to set up.
*/
function useSetupPageViewTelemetry(page) {
	const telemetry = useTelemetry();
	const store = useInstanceAiSettingsStore();
	const emitted = ref(false);
	watch(() => store.isLoading ? null : store.settings, (settings) => {
		if (!settings || emitted.value) return;
		if (store.isCloudManaged || store.isProxyEnabled) return;
		emitted.value = true;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_AI_ASSISTANT_SETUP_PAGE, {
			page,
			...buildSetupSnapshot(settings, store.instanceModelCredentials, store.serviceCredentials)
		});
	}, { immediate: true });
}
//#endregion
export { useSetupPageViewTelemetry as t };
