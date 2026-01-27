import { computed, ref } from 'vue';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRBACStore } from '@/app/stores/rbac.store';
import * as secretsProviderApi from '@n8n/rest-api-client';
import {
	mockGetSecretProviderConnections,
	mockGetSecretProviderTypes,
} from './useSecretsProviders.mock';

export function useSecretsProviders(options?: { useMockApi?: boolean }) {
	// TODO: Set to false when backend API is ready and remove mock file
	const USE_MOCK_API = options?.useMockApi ?? true;
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const rbacStore = useRBACStore();

	const providerTypes = ref<SecretProviderTypeResponse[]>([]);
	const secrets = ref<Record<string, string[]>>({});
	const activeConnections = ref<SecretProviderConnection[]>([]);
	const isLoadingProviderTypes = ref(false);
	const isLoadingActiveConnections = ref(false);

	async function fetchProviderTypes() {
		isLoadingProviderTypes.value = true;
		try {
			if (USE_MOCK_API) {
				providerTypes.value = await mockGetSecretProviderTypes();
			} else {
				providerTypes.value = await secretsProviderApi.getSecretProviderTypes(
					rootStore.restApiContext,
				);
			}
		} finally {
			isLoadingProviderTypes.value = false;
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
				activeConnections.value = await secretsProviderApi.getSecretProviderConnections(
					rootStore.restApiContext,
				);
			}
		} catch {
			activeConnections.value = [];
		} finally {
			isLoadingActiveConnections.value = false;
		}
	}

	const isLoading = computed(
		() => isLoadingProviderTypes.value || isLoadingActiveConnections.value,
	);

	const isEnterpriseExternalSecretsEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets],
	);

	const activeProviders = computed(() => {
		return ([...activeConnections.value] as SecretProviderConnection[])
			.filter((provider) => provider.isEnabled && provider.state === 'connected')
			.sort((a, b) => b.name.localeCompare(a.name));
	});

	return {
		providerTypes: computed(() => providerTypes.value),
		fetchProviderTypes,
		activeProviders,
		fetchActiveConnections,
		isLoading,
		isEnterpriseExternalSecretsEnabled,
		secrets: computed(() => secrets.value),
	};
}
