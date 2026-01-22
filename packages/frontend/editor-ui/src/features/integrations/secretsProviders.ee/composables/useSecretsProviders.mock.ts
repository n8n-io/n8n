import type { SecretProviderConnection, SecretProviderType } from '@n8n/api-types';

/**
 * Mock data for secret provider types
 */
export const MOCK_PROVIDER_TYPES: SecretProviderType[] = [
	{
		type: 'awsSecretsManager',
		displayName: 'AWS Secrets Manager',
		icon: 'awsSecretsManager',
		properties: [],
	},
	{
		type: 'gcpSecretsManager',
		displayName: 'GCP Secrets Manager',
		icon: 'gcpSecretsManager',
		properties: [],
	},
	{
		type: 'azureKeyVault',
		displayName: 'Azure Key Vault',
		icon: 'azureKeyVault',
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
export async function mockGetSecretProviderTypes(): Promise<SecretProviderType[]> {
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
		displayName: 'AWS Secrets Manager',
		isGlobal: false,
		state: 'connected',
		enabled: true,
		settings: {
			region: 'us-east-1',
		},
		homeProject: {
			id: 'GanI3bYpb8iNzQuW',
			type: 'team',
			name: 'Production',
			icon: {
				type: 'icon',
				value: 'layers',
			},
			createdAt: new Date('2024-01-20T14:45:00Z').toISOString(),
			updatedAt: new Date('2024-01-20T14:45:00Z').toISOString(),
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
	},
	{
		id: 'aBcDeFgHiJkLmNoP',
		name: 'gcp-staging',
		type: 'gcpSecretsManager',
		displayName: 'Google Cloud Secret Manager',
		isGlobal: false,
		state: 'connected',
		enabled: true,
		settings: {
			projectId: 'my-gcp-project-staging',
		},
		homeProject: {
			id: 'XyZ123AbC456DeF7',
			type: 'team',
			name: 'Staging Environment',
			icon: {
				type: 'icon',
				value: 'test-tube',
			},
			createdAt: new Date('2024-01-20T14:45:00Z').toISOString(),
			updatedAt: new Date('2024-01-20T14:45:00Z').toISOString(),
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
