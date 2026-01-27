import { createComponentRenderer } from '@/__tests__/render';
import SecretsProviderConnectionCard from './SecretsProviderConnectionCard.ee.vue';
import type { SecretProviderConnection } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { MOCK_PROVIDER_TYPES } from '../composables/useSecretsProviders.mock';

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
		const { getByText } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo },
		});

		expect(getByText('aws-production')).toBeInTheDocument();
	});

	it('should display provider display name', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByText } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo },
		});

		expect(getByText('AWS Secrets Manager')).toBeInTheDocument();
	});

	it('should render provider image component', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { getByTestId } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo },
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

		const { container } = renderComponent({
			props: { provider: providerWithNoSecrets, providerTypeInfo },
		});

		expect(container.textContent).toContain('0 secrets');
	});

	it('should display singular "secret" for count of 1', () => {
		const providerWithOneSecret: SecretProviderConnection = {
			...mockProvider,
			secretsCount: 1,
			secrets: [{ name: 'secret.api.key', credentialsCount: 1 }],
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { container } = renderComponent({
			props: { provider: providerWithOneSecret, providerTypeInfo },
		});

		expect(container.textContent).toContain('1 secret');
		expect(container.textContent).not.toContain('1 secrets');
	});

	it('should display plural "secrets" for count greater than 1', () => {
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);
		const { container } = renderComponent({
			props: { provider: mockProvider, providerTypeInfo },
		});

		expect(container.textContent).toContain('5 secrets');
	});

	it('should format date correctly for different dates', () => {
		const recentProvider: SecretProviderConnection = {
			...mockProvider,
			createdAt: '2024-12-25T10:30:00.000Z',
		};
		const providerTypeInfo = MOCK_PROVIDER_TYPES.find((t) => t.type === mockProvider.type);

		const { container } = renderComponent({
			props: { provider: recentProvider, providerTypeInfo },
		});

		const expectedDate = DateTime.fromISO('2024-12-25T10:30:00.000Z').toFormat('dd LLL yyyy');
		expect(container.textContent).toContain(expectedDate);
	});
});
