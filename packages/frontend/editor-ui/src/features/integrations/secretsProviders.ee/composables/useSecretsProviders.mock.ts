import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';

/**
 * Mock data for secret provider types
 */
export const MOCK_PROVIDER_TYPES: SecretProviderTypeResponse[] = [
	{
		type: 'awsSecretsManager',
		displayName: 'AWS Secrets Manager',
		icon: 'aws-secrets-manager',
		properties: [
			{
				displayName:
					'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
				name: 'notice',
				type: 'notice',
				default: '',
				noDataExpression: true,
			},
			{
				displayName: 'Region',
				name: 'region',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. eu-west-3',
				noDataExpression: true,
			},
			{
				displayName: 'Authentication Method',
				name: 'authMethod',
				type: 'options',
				options: [
					{
						name: 'IAM User',
						value: 'iamUser',
						description:
							'Credentials for IAM user having <code>secretsmanager:ListSecrets</code> and <code>secretsmanager:BatchGetSecretValue</code> permissions. <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html" target="_blank">Learn more</a>',
					},
					{
						name: 'Auto Detect',
						value: 'autoDetect',
						description:
							'Use automatic credential detection to authenticate AWS calls for external secrets<a href="https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain" target="_blank">Learn more</a>.',
					},
				],
				default: 'iamUser',
				required: true,
				noDataExpression: true,
			},
			{
				displayName: 'Access Key ID',
				name: 'accessKeyId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. ACHXUQMBAQEVTE2RKMWP',
				noDataExpression: true,
				displayOptions: {
					show: {
						authMethod: ['iamUser'],
					},
				},
			},
			{
				displayName: 'Secret Access Key',
				name: 'secretAccessKey',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. cbmjrH/xNAjPwlQR3i/1HRSDD+esQX/Lan3gcmBc',
				typeOptions: {
					password: true,
				},
				noDataExpression: true,
				displayOptions: {
					show: {
						authMethod: ['iamUser'],
					},
				},
			},
		],
	},
	{
		type: 'gcpSecretsManager',
		displayName: 'GCP Secrets Manager',
		icon: 'gcp-secrets-manager',
		properties: [
			{
				displayName:
					'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
				name: 'notice',
				type: 'notice',
				default: '',
				noDataExpression: true,
			},
			{
				displayName: 'Service Account Key',
				name: 'serviceAccountKey',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					password: true,
				},
				placeholder: 'e.g. { "type": "service_account", "project_id": "gcp-secrets-store", ... }',
				hint: 'Content of JSON file downloaded from Google Cloud Console.',
				noDataExpression: true,
			},
		],
	},
	{
		type: 'azureKeyVault',
		displayName: 'Azure Key Vault',
		icon: 'azure-key-vault',
		properties: [
			{
				displayName:
					'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
				name: 'notice',
				type: 'notice',
				default: '',
				noDataExpression: true,
			},
			{
				displayName: 'Vault Name',
				hint: 'The name of your existing Azure Key Vault.',
				name: 'vaultName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. my-vault',
				noDataExpression: true,
			},
			{
				displayName: 'Tenant ID',
				name: 'tenantId',
				hint: 'In Azure, this can be called "Directory (Tenant) ID".',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. 7dec9324-7074-72b7-a3ca-a9bb3012f466',
				noDataExpression: true,
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				hint: 'In Azure, this can be called "Application (Client) ID".',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. 7753d8c2-e41f-22ed-3dd7-c9e96463622c',
				typeOptions: {
					password: true,
				},
				noDataExpression: true,
			},
			{
				displayName: 'Client Secret',
				name: 'clientSecret',
				hint: 'The client secret value of your registered application.',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					password: true,
				},
				noDataExpression: true,
			},
		],
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
	await new Promise((resolve) => setTimeout(resolve, 200));
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
		state: 'error',
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
	await new Promise((resolve) => setTimeout(resolve, 200));
	return MOCK_ACTIVE_CONNECTIONS;
}

/**
 * Mock API call for getting a single connection by ID
 */
export async function mockGetSecretProviderConnectionByKey(
	providerKey: string,
): Promise<SecretProviderConnection> {
	await new Promise((resolve) => setTimeout(resolve, 150));
	return (
		MOCK_ACTIVE_CONNECTIONS.find((connection) => connection.name === providerKey) ??
		MOCK_ACTIVE_CONNECTIONS[0]
	);
}

/**
 * Mock API call for creating a new connection
 */
export async function mockCreateSecretProviderConnection(connectionData: {
	type: SecretProviderConnection['type'];
	isGlobal: boolean;
	settings: Record<string, unknown>;
	projectIds: string[];
}): Promise<SecretProviderConnection> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	const providerKey = `${connectionData.type}_${Date.now()}`;
	return {
		id: providerKey,
		name: providerKey,
		type: connectionData.type,
		settings: connectionData.settings,
		projects: connectionData.projectIds.map((id) => ({ id, name: 'Project' })),
		state: 'connected',
		isEnabled: true,
		secretsCount: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Mock API call for updating an existing connection
 */
export async function mockUpdateSecretProviderConnection(
	providerKey: string,
	connectionData: {
		isGlobal: boolean;
		projectIds: string[];
		settings: Record<string, unknown>;
	},
): Promise<SecretProviderConnection> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	return {
		id: providerKey,
		type: 'awsSecretsManager',
		name: providerKey,
		settings: connectionData.settings,
		projects: connectionData.projectIds.map((id) => ({ id, name: 'Project' })),
		state: 'connected',
		isEnabled: true,
		secretsCount: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Mock API call for testing a connection
 */
export async function mockTestSecretProviderConnection(): Promise<{
	success: boolean;
	testState: SecretProviderConnection['state'];
}> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	return { success: true, testState: 'connected' };
}
