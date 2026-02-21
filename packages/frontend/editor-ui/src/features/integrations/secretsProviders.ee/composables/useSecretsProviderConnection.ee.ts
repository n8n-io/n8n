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
	const connectionError = ref<string | undefined>(undefined);
	const isLoading = ref(false);
	const isTesting = ref(false);

	// API operations
	async function testConnection(providerKey: string): Promise<SecretProviderConnection['state']> {
		// POST /rest/secret-providers/connections/:connectionId/test
		isTesting.value = true;
		try {
			const { testState, error } = await testSecretProviderConnection(
				rootStore.restApiContext,
				providerKey,
			);

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
		// GET /rest/secret-providers/connections/:providerKey
		isLoading.value = true;
		try {
			const connection = await getSecretProviderConnectionByKey(
				rootStore.restApiContext,
				providerKey,
			);

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
		connectionError,
		isLoading,
		isTesting,

		// Methods
		getConnection,
		createConnection,
		updateConnection,
		testConnection,
	};
}
