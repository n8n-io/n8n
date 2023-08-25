import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import * as externalSecretsApi from '@/api/externalSecrets.ee';
import { connectProvider } from '@/api/externalSecrets.ee';
import { useUsersStore } from '@/stores/users.store';
import type { ExternalSecretsProvider } from '@/Interface';

export const useExternalSecretsStore = defineStore('externalSecrets', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const state = reactive({
		providers: [] as ExternalSecretsProvider[],
		secrets: {} as Record<string, string[]>,
		connectionState: {} as Record<string, ExternalSecretsProvider['state']>,
	});

	const isEnterpriseExternalSecretsEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets),
	);

	const secrets = computed(() => state.secrets);
	const providers = computed(() => state.providers);
	const connectionState = computed(() => state.connectionState);

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
		if (usersStore.isInstanceOwner) {
			try {
				state.secrets = await externalSecretsApi.getExternalSecrets(rootStore.getRestApiContext);
			} catch (error) {
				state.secrets = {};
			}
		}
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

	function setConnectionState(id: string, connectionState: ExternalSecretsProvider['state']) {
		state.connectionState[id] = connectionState;
	}

	return {
		state,
		providers,
		secrets,
		connectionState,
		secretsAsObject,
		isEnterpriseExternalSecretsEnabled,
		fetchAllSecrets,
		getProvider,
		getProviders,
		testProviderConnection,
		updateProvider,
		updateStoredProvider,
		updateProviderConnected,
		reloadProvider,
		setConnectionState,
	};
});
