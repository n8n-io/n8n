import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import * as externalSecretsApi from '@n8n/rest-api-client';
import { connectProvider } from '@n8n/rest-api-client';
import { useRBACStore } from '@/app/stores/rbac.store';
import type { ExternalSecretsProvider } from '@n8n/api-types';

/**
 * Transforms flat dot-notated secret keys into a nested object structure.
 *
 * Takes secrets grouped by provider (e.g., `{ "aws": ["db.host", "db.password", "api_key"] }`)
 * and converts them into nested objects with masked values (e.g., `{ "aws": { "db": { "host": "*********", "password": "*********" }, "api_key": "*********" } }`).
 *
 * @param secrets - Record of provider names to arrays of dot-notated secret keys
 * @returns Nested object structure with all values masked as '*********'
 */
function transformSecretsToNestedObject(
	secrets: Record<string, string[]>,
): Record<string, Record<string, object | string>> {
	return Object.keys(secrets).reduce<Record<string, Record<string, object | string>>>(
		(providerAcc, provider) => {
			const providerSecrets = secrets[provider];
			if (!Array.isArray(providerSecrets)) return providerAcc;
			providerAcc[provider] = providerSecrets.reduce<Record<string, object | string>>(
				(secretAcc, secret) => {
					const splitSecret = secret.split('.');
					if (splitSecret.length === 1) {
						secretAcc[secret] = '*********';
						return secretAcc;
					}
					const obj = secretAcc[splitSecret[0]] ?? {};
					let acc = obj;
					for (let i = 1; i < splitSecret.length; i++) {
						const key = splitSecret[i] as keyof typeof acc;
						// Actual value key
						if (i === splitSecret.length - 1) {
							const key = splitSecret[i] as keyof typeof acc;
							acc[key] = '*********' as (typeof acc)[typeof key];
							continue;
						}
						if (Object.keys(acc) && !acc[key]) {
							acc[key] = {} as (typeof acc)[typeof key];
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
}

export const useExternalSecretsStore = defineStore('externalSecrets', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();

	const state = reactive({
		providers: [] as ExternalSecretsProvider[],
		globalSecrets: {} as Record<string, string[]>,
		projectSecrets: {} as Record<string, string[]>,
		connectionState: {} as Record<string, ExternalSecretsProvider['state']>,
	});

	const isEnterpriseExternalSecretsEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets],
	);

	const secrets = computed(() => state.globalSecrets);
	const projectSecrets = computed(() => state.projectSecrets);
	const providers = computed(() => state.providers);
	const connectionState = computed(() => state.connectionState);

	const secretsAsObject = computed(() => transformSecretsToNestedObject(secrets.value));

	const projectSecretsAsObject = computed(() =>
		transformSecretsToNestedObject(projectSecrets.value),
	);

	/**
	 * Combined secrets from both global and project scopes.
	 * Note: The backend enforces that provider names are unique across scopes, preventing conflicts.
	 */
	const globalAndProjectSecretsAsObject = computed(() => ({
		...secretsAsObject.value,
		...projectSecretsAsObject.value,
	}));

	async function fetchGlobalSecrets() {
		if (rbacStore.hasScope('externalSecret:list')) {
			try {
				state.globalSecrets = await externalSecretsApi.getExternalSecrets(rootStore.restApiContext);
			} catch (error) {
				state.globalSecrets = {};
			}
		}
	}

	async function fetchProjectSecrets(projectId: string) {
		if (rbacStore.hasScope('externalSecret:list')) {
			try {
				state.projectSecrets = await externalSecretsApi.getProjectExternalSecretsMock(
					rootStore.restApiContext,
					projectId,
				);
			} catch (error) {
				state.projectSecrets = {};
			}
		}
	}

	async function reloadProvider(id: string) {
		const { updated } = await externalSecretsApi.reloadProvider(rootStore.restApiContext, id);
		if (updated) {
			await fetchGlobalSecrets();
		}

		return updated;
	}

	async function getProviders() {
		state.providers = await externalSecretsApi.getExternalSecretsProviders(
			rootStore.restApiContext,
		);
	}

	async function testProviderConnection(id: string, data: ExternalSecretsProvider['data']) {
		return await externalSecretsApi.testExternalSecretsProviderConnection(
			rootStore.restApiContext,
			id,
			data,
		);
	}

	async function getProvider(id: string) {
		const provider = await externalSecretsApi.getExternalSecretsProvider(
			rootStore.restApiContext,
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
		await connectProvider(rootStore.restApiContext, id, value);
		await fetchGlobalSecrets();
		updateStoredProvider(id, { connected: value, state: value ? 'connected' : 'initializing' });
	}

	async function updateProvider(id: string, { data }: Partial<ExternalSecretsProvider>) {
		await externalSecretsApi.updateProvider(rootStore.restApiContext, id, data);
		await fetchGlobalSecrets();
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
		projectSecretsAsObject,
		globalAndProjectSecretsAsObject,
		isEnterpriseExternalSecretsEnabled,
		fetchGlobalSecrets,
		fetchProjectSecrets,
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
