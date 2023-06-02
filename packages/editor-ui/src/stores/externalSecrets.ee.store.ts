import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import * as externalSecretsApi from '@/api/externalSecrets.ee';
import type { ExternalSecretsProvider } from '@/Interface';

export const useExternalSecretsStore = defineStore('sso', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const state = reactive({
		providers: [] as ExternalSecretsProvider[],
	});

	const isEnterpriseExternalSecretsEnabled = computed(
		() =>
			settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets) || true,
	);

	const providers = computed(() => state.providers);
	const providerById = computed(() => (id: string) => {
		return computed(() => state.providers.find((provider) => provider.id === id));
	});

	async function getProviders() {
		state.providers = await externalSecretsApi.getExternalSecretsProviders(
			rootStore.getRestApiContext,
		);
	}

	async function getProvider(id: string) {
		const provider = await externalSecretsApi.getExternalSecretsProvider(
			rootStore.getRestApiContext,
			id,
		);

		const existingProviderIndex = state.providers.findIndex((p) => p.id === id);
		if (existingProviderIndex !== -1) {
			state.providers.splice(existingProviderIndex, 1, provider);
		} else {
			state.providers.push(provider);
		}
	}

	return {
		providers,
		isEnterpriseExternalSecretsEnabled,
		getProvider,
		getProviders,
		providerById,
	};
});
