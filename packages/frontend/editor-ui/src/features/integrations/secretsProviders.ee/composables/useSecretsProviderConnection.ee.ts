import { ref } from 'vue';
import type {
	SecretProviderConnection,
	ReloadSecretProviderConnectionResponse,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getSecretProviderConnectionByKey,
	createSecretProviderConnection,
	updateSecretProviderConnection,
	testSecretProviderConnection,
	reloadSecretProviderConnection,
	getProjectSecretProviderConnectionByKey,
	createProjectSecretProviderConnection,
	updateProjectSecretProviderConnection,
	testProjectSecretProviderConnection,
} from '@n8n/rest-api-client';

/**
 * Low-level composable for secrets provider connection API operations.
 * This composable handles pure API calls and data transformations.
 * UI feedback (toasts, errors) should be handled by the caller.
 */

export function useSecretsProviderConnection(projectId?: string) {
	const rootStore = useRootStore();

	const connectionState = ref<SecretProviderConnection['state']>('initializing');
	const connectionError = ref<string | undefined>(undefined);
	const isLoading = ref(false);
	const isTesting = ref(false);

	// API operations
	async function testConnection(providerKey: string): Promise<SecretProviderConnection['state']> {
		isTesting.value = true;
		try {
			const { testState, error } = projectId
				? await testProjectSecretProviderConnection(
						rootStore.restApiContext,
						projectId,
						providerKey,
					)
				: await testSecretProviderConnection(rootStore.restApiContext, providerKey);

			connectionState.value = testState === 'tested' ? 'connected' : testState;
			connectionError.value = error;

			return connectionState.value;
		} catch {
			connectionState.value = 'error';
			return 'error';
		} finally {
			isTesting.value = false;
		}
	}

	async function getConnection(providerKey: string): Promise<SecretProviderConnection> {
		isLoading.value = true;
		try {
			const connection = projectId
				? await getProjectSecretProviderConnectionByKey(
						rootStore.restApiContext,
						projectId,
						providerKey,
					)
				: await getSecretProviderConnectionByKey(rootStore.restApiContext, providerKey);

			return connection;
		} finally {
			isLoading.value = false;
		}
	}

	async function createConnection(connectionData: {
		providerKey: string;
		type: SecretProviderConnection['type'];
		settings: Record<string, unknown>;
		projectIds: string[];
	}): Promise<SecretProviderConnection> {
		const connection = projectId
			? await createProjectSecretProviderConnection(rootStore.restApiContext, projectId, {
					providerKey: connectionData.providerKey,
					type: connectionData.type,
					projectIds: [projectId],
					settings: connectionData.settings,
				})
			: await createSecretProviderConnection(rootStore.restApiContext, {
					...connectionData,
					isGlobal: true,
				});

		return connection;
	}

	async function updateConnection(
		providerKey: string,
		connectionData: {
			isGlobal: boolean;
			projectIds: string[];
			settings: Record<string, unknown>;
		},
	): Promise<SecretProviderConnection> {
		const connection = projectId
			? await updateProjectSecretProviderConnection(
					rootStore.restApiContext,
					projectId,
					providerKey,
					{ settings: connectionData.settings },
				)
			: await updateSecretProviderConnection(rootStore.restApiContext, providerKey, connectionData);

		return connection;
	}

	async function reloadConnection(
		providerKey: string,
	): Promise<ReloadSecretProviderConnectionResponse> {
		return await reloadSecretProviderConnection(rootStore.restApiContext, providerKey);
	}

	return {
		// State
		connectionState,
		connectionError,
		isLoading,
		isTesting,

		// Methods
		getConnection,
		createConnection,
		updateConnection,
		testConnection,
		reloadConnection,
	};
}
