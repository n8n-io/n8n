import type { InstanceAiAdminSettingsResponse, InstanceAiProviderConnection } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { ref, watch } from 'vue';

import {
	INSTANCE_AI_MODEL_PROVIDERS,
	INSTANCE_AI_SEARCH_PROVIDERS,
} from './instanceAiConnection.constants';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';

type SetupPageViewedProps = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_AI_ASSISTANT_SETUP_PAGE
>;
type SetupSnapshot = Omit<SetupPageViewedProps, 'page'>;

/**
 * Configuration state of each setup component, mirroring the backend snapshot
 * on "AI Assistant setup completed". Provider names for env-var configuration
 * are not exposed to the frontend, so they report as null here.
 */
export function buildSetupSnapshot(
	settings: InstanceAiAdminSettingsResponse,
	modelCredentials: InstanceAiProviderConnection[],
	serviceCredentials: InstanceAiProviderConnection[],
): SetupSnapshot {
	const modelSource: SetupSnapshot['model_source'] = settings.modelEnvConfigured
		? 'env'
		: settings.modelCredentialId && settings.modelName
			? 'ui'
			: 'none';
	const modelCredentialType = modelCredentials.find(
		(credential) => credential.id === settings.modelCredentialId,
	)?.type;
	const modelProvider =
		modelSource === 'ui'
			? (INSTANCE_AI_MODEL_PROVIDERS.find(
					(provider) => provider.credentialType === modelCredentialType,
				)?.id ?? null)
			: null;
	const sandboxSource: SetupSnapshot['sandbox_source'] = !settings.sandboxEnabled
		? 'none'
		: settings.sandboxEnvConfigured
			? 'env'
			: settings.daytonaCredentialId || settings.n8nSandboxCredentialId
				? 'ui'
				: 'none';
	const searchSource: SetupSnapshot['web_search_source'] = settings.searchCredentialId
		? 'ui'
		: settings.searchEnvConfigured
			? 'env'
			: settings.searchDisabled
				? 'disabled'
				: 'none';
	const searchCredentialType = serviceCredentials.find(
		(credential) => credential.id === settings.searchCredentialId,
	)?.type;
	const searchProvider =
		searchSource === 'ui'
			? (INSTANCE_AI_SEARCH_PROVIDERS.find(
					(provider) => provider.credentialType === searchCredentialType,
				)?.id ?? null)
			: searchSource === 'env'
				? settings.envManaged?.search.apiKey
					? 'brave'
					: settings.envManaged?.search.url
						? 'searxng'
						: null
				: null;
	return {
		model_source: modelSource,
		model_provider: modelProvider,
		model_name: modelSource === 'none' ? null : settings.modelName,
		sandbox_source: sandboxSource,
		sandbox_type: sandboxSource === 'none' ? null : settings.sandboxProvider,
		web_search_source: searchSource,
		web_search_provider: searchProvider,
	};
}

/**
 * Reports one "User viewed AI Assistant setup page" per view of a setup
 * surface, once the settings load so the snapshot reflects real state.
 * Managed deployments (cloud, proxy) never emit: there is nothing to set up.
 */
export function useSetupPageViewTelemetry(page: SetupPageViewedProps['page']): void {
	const telemetry = useTelemetry();
	const store = useInstanceAiSettingsStore();
	const emitted = ref(false);
	watch(
		() => (store.isLoading ? null : store.settings),
		(settings) => {
			if (!settings || emitted.value) return;
			if (store.isCloudManaged || store.isProxyEnabled) return;
			emitted.value = true;
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_VIEWED_AI_ASSISTANT_SETUP_PAGE, {
				page,
				...buildSetupSnapshot(settings, store.instanceModelCredentials, store.serviceCredentials),
			});
		},
		{ immediate: true },
	);
}
