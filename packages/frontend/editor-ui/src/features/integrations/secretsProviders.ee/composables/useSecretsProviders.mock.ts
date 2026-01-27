import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';

/**
 * Mock data for secret provider types
 */
export const MOCK_PROVIDER_TYPES: SecretProviderTypeResponse[] = [
	{
		type: 'awsSecretsManager',
		displayName: 'AWS Secrets Manager',
		icon: 'aws-secrets-manager',
		properties: [],
	},
	{
		type: 'gcpSecretsManager',
		displayName: 'GCP Secrets Manager',
		icon: 'gcp-secrets-manager',
		properties: [],
	},
	{
		type: 'azureKeyVault',
		displayName: 'Azure Key Vault',
		icon: 'azure-key-vault',
		properties: [],
	},
	{
		type: 'vault',
		displayName: 'HashiCorp Vault',
		icon: 'vault',
		properties: [],
	},
];

/**
 * Mock function to simulate fetching secret provider types
 */
export async function mockGetSecretProviderTypes(): Promise<SecretProviderTypeResponse[]> {
	// Simulate network delay
	await new Promise((resolve) => setTimeout(resolve, 300));
	return MOCK_PROVIDER_TYPES;
}

/**
 * Mock data for secrets provider connections
 * TODO: Remove this file when backend API is ready
 */
export const MOCK_ACTIVE_CONNECTIONS: SecretProviderConnection[] = [
	{
		id: 'OFUbXqIigpUhTiOy',
		name: 'aws-production',
		type: 'awsSecretsManager',
		state: 'connected',
		isEnabled: true,
		projects: [
			{
				id: 'GanI3bYpb8iNzQuW',
				name: 'Production',
			},
		],
		settings: {
			region: 'us-east-1',
		},
		secretsCount: 2,
		secrets: [
			{
				name: 'secret.n8n_api.base_url',
				credentialsCount: 0,
			},
			{
				name: 'secret.n8n_api.key',
				credentialsCount: 10,
			},
		],
		createdAt: new Date('2024-01-20T14:45:00Z').toISOString(),
		updatedAt: new Date('2024-01-20T14:45:00Z').toISOString(),
	},
	{
		id: 'aBcDeFgHiJkLmNoP',
		name: 'gcp-staging',
		type: 'gcpSecretsManager',
		state: 'connected',
		isEnabled: true,
		projects: [
			{
				id: 'XyZ123AbC456DeF7',
				name: 'Staging Environment',
			},
		],
		settings: {
			projectId: 'my-gcp-project-staging',
		},
		secretsCount: 5,
		secrets: [
			{
				name: 'secret.db.password',
				credentialsCount: 3,
			},
			{
				name: 'secret.api.token',
				credentialsCount: 7,
			},
			{
				name: 'secret.stripe.key',
				credentialsCount: 1,
			},
		],
		createdAt: new Date('2024-01-22T09:15:00Z').toISOString(),
		updatedAt: new Date('2024-01-22T09:15:00Z').toISOString(),
	},
];

/**
 * Mock API call for fetching active connections
 * Simulates network delay
 */
export async function mockGetSecretProviderConnections(): Promise<SecretProviderConnection[]> {
	// Simulate network delay
	await new Promise((resolve) => setTimeout(resolve, 500));
	return MOCK_ACTIVE_CONNECTIONS;
}
