import { ref } from 'vue';
import type { SecretProviderConnection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getSecretProviderConnectionByKey,
	createSecretProviderConnection,
	updateSecretProviderConnection,
	testSecretProviderConnection,
} from '@n8n/rest-api-client';

/**
 * Low-level composable for secrets provider connection API operations.
 * This composable handles pure API calls and data transformations.
 * UI feedback (toasts, errors) should be handled by the caller.
 */

export function useSecretsProviderConnection() {
	const rootStore = useRootStore();

	const connectionState = ref<SecretProviderConnection['state']>('initializing');
	const isLoading = ref(false);
	const isTesting = ref(false);

	// API operations
	async function testConnection(connectionId: string): Promise<SecretProviderConnection['state']> {
		// POST /rest/secret-providers/connections/:connectionId/test
		isTesting.value = true;
		try {
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

	async function getConnection(providerKey: string): Promise<SecretProviderConnection> {
		// GET /rest/secret-providers/connections/:providerKey
		isLoading.value = true;
		try {
			const connection = await getSecretProviderConnectionByKey(
				rootStore.restApiContext,
				providerKey,
			);

			await testConnection(connection.id);
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
		// PUT /rest/secret-providers/connections/:providerKey
		const connection = await createSecretProviderConnection(rootStore.restApiContext, {
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
		const connection = await updateSecretProviderConnection(
			rootStore.restApiContext,
			providerKey,
			connectionData,
		);

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
