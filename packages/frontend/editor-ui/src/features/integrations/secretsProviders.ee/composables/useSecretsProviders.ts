import { computed, ref } from 'vue';
import type { ExternalSecretsProvider } from '@n8n/api-types';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRBACStore } from '@/app/stores/rbac.store';
import * as secretsProviderApi from '@n8n/rest-api-client';

export function useSecretsProviders() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const rbacStore = useRBACStore();

	const providers = ref<ExternalSecretsProvider[]>([]);
	const secrets = ref<Record<string, string[]>>({});
	const activeConnections = ref<ExternalSecretsProvider[]>([]);

	async function fetchProviders() {
		providers.value = await secretsProviderApi.getExternalSecretsProviders(
			rootStore.restApiContext,
		);
	}

	async function fetchActiveConnections() {
		if (!rbacStore.hasScope('externalSecretsProvider:list')) {
			return;
		}

		try {
			activeConnections.value = await secretsProviderApi.getSecretProviderConnections(
				rootStore.restApiContext,
			);
		} catch {
			activeConnections.value = [];
		}
	}

	const isLoading = computed(() => false);

	const isEnterpriseExternalSecretsEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets],
	);

	const activeProviders = computed(() => {
		return ([...activeConnections.value] as ExternalSecretsProvider[])
			.filter((provider) => provider.connected)
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
