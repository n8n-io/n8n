import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import * as externalSecretsApi from '@/api/externalSecrets.ee';
import { connectProvider, reloadProvider } from '@/api/externalSecrets.ee';
import type { ExternalSecretsProvider } from '@/Interface';

export const useExternalSecretsStore = defineStore('externalSecrets', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const state = reactive({
		providers: [] as ExternalSecretsProvider[],
		secrets: {} as Record<string, string[]>,
	});

	const isEnterpriseExternalSecretsEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets),
	);

	const secrets = computed(() => state.secrets);
	const providers = computed(() => state.providers);

	const secretsAsObject = computed(() => {
		return Object.keys(secrets.value).reduce<Record<string, Record<string, object | string>>>(
			(providerAcc, provider) => {
				providerAcc[provider] = secrets.value[provider]?.reduce<Record<string, object | string>>(
					(secretAcc, secret) => {
						const splitSecret = secret.split('.');
						if (splitSecret.length === 1) {
							secretAcc[secret] = '*********';
							return secretAcc;
						}
						const obj = (secretAcc[splitSecret[0]] ?? {}) as object;
						let acc: any = obj;
						for (let i = 1; i < splitSecret.length; i++) {
							const key = splitSecret[i];
							// Actual value key
							if (i === splitSecret.length - 1) {
								acc[key] = '*********';
								continue;
							}
							if (!(key in acc)) {
								acc[key] = {};
							}
							acc = acc[key];
						}
						secretAcc[splitSecret[0]] = obj;
						return secretAcc;
					},
					{},
				);

				return providerAcc;
			},
			{},
		);
	});

	async function fetchAllSecrets() {
		state.secrets = await externalSecretsApi.getExternalSecrets(rootStore.getRestApiContext);
	}

	async function reloadProvider(id: string) {
		const { updated } = await externalSecretsApi.reloadProvider(rootStore.getRestApiContext, id);
		if (updated) {
			await fetchAllSecrets();
		}

		return updated;
	}

	async function getProviders() {
		state.providers = await externalSecretsApi.getExternalSecretsProviders(
			rootStore.getRestApiContext,
		);
	}

	async function testProviderConnection(id: string, data: ExternalSecretsProvider['data']) {
		return externalSecretsApi.testExternalSecretsProviderConnection(
			rootStore.getRestApiContext,
			id,
			data,
		);
	}

	async function getProvider(id: string) {
		const provider = await externalSecretsApi.getExternalSecretsProvider(
			rootStore.getRestApiContext,
			id,
		);

		const existingProviderIndex = state.providers.findIndex((p) => p.name === id);
		if (existingProviderIndex !== -1) {
			state.providers.splice(existingProviderIndex, 1, provider);
		} else {
			state.providers.push(provider);
		}

		return provider;
	}

	function updateStoredProvider(id: string, data: Partial<ExternalSecretsProvider>) {
		const providerIndex = state.providers.findIndex((p) => p.name === id);
		state.providers = [
			...state.providers.slice(0, providerIndex),
			{
				...state.providers[providerIndex],
				...data,
				data: {
					...state.providers[providerIndex].data,
					...data.data,
				},
			},
			...state.providers.slice(providerIndex + 1),
		];
	}

	async function updateProviderConnected(id: string, value: boolean) {
		await connectProvider(rootStore.getRestApiContext, id, value);
		await fetchAllSecrets();
		updateStoredProvider(id, { connected: value, state: value ? 'connected' : 'initializing' });
	}

	async function updateProvider(id: string, { data }: Partial<ExternalSecretsProvider>) {
		await externalSecretsApi.updateProvider(rootStore.getRestApiContext, id, data);
		await fetchAllSecrets();
		updateStoredProvider(id, { data });
	}

	return {
		providers,
		secrets,
		secretsAsObject,
		isEnterpriseExternalSecretsEnabled,
		fetchAllSecrets,
		getProvider,
		getProviders,
		testProviderConnection,
		updateProvider,
		updateProviderConnected,
		reloadProvider,
	};
});
