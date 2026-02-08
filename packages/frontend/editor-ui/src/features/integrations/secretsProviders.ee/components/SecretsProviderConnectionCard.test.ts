import { screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import SecretsProviderConnectionCard from './SecretsProviderConnectionCard.ee.vue';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@n8n/api-types';
import { DateTime } from 'luxon';

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

const renderComponent = createComponentRenderer(SecretsProviderConnectionCard);

describe('SecretsProviderConnectionCard', () => {
	const mockProvider: SecretProviderConnection = {
		id: 'test-id-123',
		name: 'aws-production',
		type: 'awsSecretsManager',
		state: 'connected',
		isEnabled: true,
		projects: [],
		secretsCount: 5,
		secrets: [
			{ name: 'secret.api.key', credentialsCount: 3 },
			{ name: 'secret.db.password', credentialsCount: 2 },
		],
		createdAt: '2024-01-20T14:45:00.000Z',
		updatedAt: '2024-01-20T14:45:00.000Z',
		settings: {
			region: 'us-east-1',
		},
	};

	it('should render provider name in header', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-name')).toHaveTextContent('aws-production');
	});

	it('should display provider display name', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-display-name')).toHaveTextContent('AWS Secrets Manager');
	});

	it('should render provider image component', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-image')).toBeInTheDocument();
	});

	it('should handle provider with zero secrets', () => {
		const providerWithNoSecrets: SecretProviderConnection = {
			...mockProvider,
			secretsCount: 0,
			secrets: [],
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: providerWithNoSecrets, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-secrets-count')).toHaveTextContent('0 secrets');
	});

	it('should display singular "secret" for count of 1', () => {
		const providerWithOneSecret: SecretProviderConnection = {
			...mockProvider,
			secretsCount: 1,
			secrets: [{ name: 'secret.api.key', credentialsCount: 1 }],
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: providerWithOneSecret, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-secrets-count')).toHaveTextContent('1 secret');
	});

	it('should display plural "secrets" for count greater than 1', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-secrets-count')).toHaveTextContent('5 secrets');
	});

	it('should format date correctly for different dates', () => {
		const recentProvider: SecretProviderConnection = {
			...mockProvider,
			createdAt: '2024-12-25T10:30:00.000Z',
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: recentProvider, providerTypeInfo, canUpdate: true },
		});

		const expectedDate = DateTime.fromISO('2024-12-25T10:30:00.000Z').toFormat('dd LLL yyyy');
		expect(getByTestId('secrets-provider-created-at')).toHaveTextContent(expectedDate);
	});

	it('should show disconnected badge when state is error', () => {
		const disconnectedProvider: SecretProviderConnection = {
			...mockProvider,
			state: 'error',
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: disconnectedProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('disconnected-badge')).toHaveTextContent('Disconnected');
	});

	it('should not show badge when connection is in connected state', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { queryByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(queryByTestId('disconnected-badge')).not.toBeInTheDocument();
	});

	it('should show edit action when user has update permission', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: true },
		});

		expect(getByTestId('secrets-provider-action-toggle')).toBeInTheDocument();
		expect(screen.getByTestId('action-edit')).toBeInTheDocument();
	});

	it('should not show edit action when user lacks update permission', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo, canUpdate: false },
		});

		expect(getByTestId('secrets-provider-action-toggle')).toBeInTheDocument();
		expect(screen.queryAllByTestId('action-edit').length).toBe(0);
	});
});
