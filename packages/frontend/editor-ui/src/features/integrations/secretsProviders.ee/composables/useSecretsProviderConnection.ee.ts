import { ref } from 'vue';
import type { SecretProviderConnection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getSecretProviderConnectionById,
	createSecretProviderConnection,
	updateSecretProviderConnection,
	testSecretProviderConnection,
} from '@n8n/rest-api-client';
import {
	mockGetSecretProviderConnectionById,
	mockCreateSecretProviderConnection,
	mockUpdateSecretProviderConnection,
	mockTestSecretProviderConnection,
} from './useSecretsProviders.mock';

/**
 * Low-level composable for secrets provider connection API operations.
 * This composable handles pure API calls and data transformations.
 * UI feedback (toasts, errors) should be handled by the caller.
 */

export function useSecretsProviderConnection(options?: { useMockApi?: boolean }) {
	const USE_MOCK_API = options?.useMockApi ?? true;
	const rootStore = useRootStore();

	const connectionState = ref<SecretProviderConnection['state']>('initializing');
	const isLoading = ref(false);
	const isTesting = ref(false);

	// API operations
	async function testConnection(connectionId: string): Promise<SecretProviderConnection['state']> {
		// POST /rest/secret-providers/connections/:connectionId/test
		isTesting.value = true;
		try {
			if (USE_MOCK_API) {
				const { testState } = await mockTestSecretProviderConnection();
				connectionState.value = testState;
				return testState;
			}

			const { testState } = await testSecretProviderConnection(
				rootStore.restApiContext,
				connectionId,
			);

			connectionState.value = testState === 'tested' ? 'connected' : testState;

			return connectionState.value;
		} catch {
			connectionState.value = 'error';
			return 'error';
		} finally {
			isTesting.value = false;
		}
	}

	async function getConnection(connectionId: string): Promise<SecretProviderConnection> {
		// GET /rest/secret-providers/connections/:providerKey
		isLoading.value = true;
		try {
			const connection = USE_MOCK_API
				? await mockGetSecretProviderConnectionById(connectionId)
				: await getSecretProviderConnectionById(rootStore.restApiContext, connectionId);

			await testConnection(connection.id);
			return connection;
		} finally {
			isLoading.value = false;
		}
	}

	async function createConnection(connectionData: {
		providerKey: string;
		type: string;
		settings: Record<string, unknown>;
		projectIds: string[];
	}): Promise<SecretProviderConnection> {
		// PUT /rest/secret-providers/connections/:providerKey
		const connection = USE_MOCK_API
			? await mockCreateSecretProviderConnection({
					...connectionData,
					isGlobal: true,
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
		// PATCH /rest/secret-providers/connections/:providerKey
		const connection = USE_MOCK_API
			? await mockUpdateSecretProviderConnection(providerKey, connectionData)
			: await updateSecretProviderConnection(rootStore.restApiContext, providerKey, connectionData);

		return connection;
	}

	return {
		// State
		connectionState,
		isLoading,
		isTesting,

		// Methods
		getConnection,
		createConnection,
		updateConnection,
		testConnection,
	};
}
