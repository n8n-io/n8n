import { computed, ref } from 'vue';
import type { ExternalSecretsProvider, SecretProviderConnection } from '@n8n/api-types';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRBACStore } from '@/app/stores/rbac.store';
import * as secretsProviderApi from '@n8n/rest-api-client';
import { mockGetSecretProviderConnections } from './useSecretsProviders.mock';

// TODO: Set to false when backend API is ready and remove mock file
const USE_MOCK_API = true;

export function useSecretsProviders() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const rbacStore = useRBACStore();

	const providers = ref<ExternalSecretsProvider[]>([]);
	const secrets = ref<Record<string, string[]>>({});
	const activeConnections = ref<SecretProviderConnection[]>([]);
	const isLoadingProviders = ref(false);
	const isLoadingActiveConnections = ref(false);

	async function fetchProviders() {
		isLoadingProviders.value = true;
		try {
			providers.value = await secretsProviderApi.getExternalSecretsProviders(
				rootStore.restApiContext,
			);
		} finally {
			isLoadingProviders.value = false;
		}
	}

	async function fetchActiveConnections() {
		if (!rbacStore.hasScope('externalSecretsProvider:list')) {
			return;
		}

		isLoadingActiveConnections.value = true;
		try {
			if (USE_MOCK_API) {
				activeConnections.value = await mockGetSecretProviderConnections();
			} else {
				// TODO: Update when backend API returns SecretProviderConnection[]
				activeConnections.value = (await secretsProviderApi.getSecretProviderConnections(
					rootStore.restApiContext,
				)) as unknown as SecretProviderConnection[];
			}
		} catch {
			activeConnections.value = [];
		} finally {
			isLoadingActiveConnections.value = false;
		}
	}

	const isLoading = computed(() => isLoadingProviders.value || isLoadingActiveConnections.value);

	const isEnterpriseExternalSecretsEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets],
	);

	const activeProviders = computed(() => {
		return ([...activeConnections.value] as SecretProviderConnection[])
			.filter((provider) => provider.enabled && provider.state === 'connected')
			.sort((a, b) => b.name.localeCompare(a.name));
	});

	return {
		providers: computed(() => providers.value),
		fetchProviders,
		activeProviders,
		fetchActiveConnections,
		isLoading,
		isEnterpriseExternalSecretsEnabled,
		secrets: computed(() => secrets.value),
	};
}
