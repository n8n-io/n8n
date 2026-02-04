import type { SecretsProviderConnection, SecretsProviderConnectionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { SecretsProvidersConnectionsService } from '@/modules/external-secrets.ee/secrets-providers-connections.service.ee';

describe('SecretsProvidersConnectionsService', () => {
	const mockExternalSecretsManager = mock<ExternalSecretsManager>();
	const service = new SecretsProvidersConnectionsService(
		mock<SecretsProviderConnectionRepository>(),
		mock(),
		mock(),
		mockExternalSecretsManager,
	);

	beforeEach(() => jest.clearAllMocks());

	describe('toPublicConnection', () => {
		it('should map entity to DTO with projects', () => {
			const connection = {
				id: 1,
				providerKey: 'my-aws',
				type: 'awsSecretsManager',
				projectAccess: [
					{ project: { id: 'p1', name: 'Project 1' } },
					{ project: { id: 'p2', name: 'Project 2' } },
				],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			expect(service.toPublicConnection(connection)).toEqual({
				id: '1',
				name: 'my-aws',
				type: 'awsSecretsManager',
				projects: [
					{ id: 'p1', name: 'Project 1' },
					{ id: 'p2', name: 'Project 2' },
				],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});
		});

		it('should map entity to DTO without projects', () => {
			const connection = {
				id: 2,
				providerKey: 'my-vault',
				type: 'vault',
				projectAccess: [],
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
			} as unknown as SecretsProviderConnection;

			expect(service.toPublicConnection(connection)).toEqual({
				id: '2',
				name: 'my-vault',
				type: 'vault',
				projects: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});
		});
	});

	describe('toSecretCompletionsResponse', () => {
		it('should map connections to completions keyed by providerKey', () => {
			mockExternalSecretsManager.getSecretNames.mockImplementation((providerKey) => {
				if (providerKey === 'aws') return ['secret-a', 'secret-b'];
				if (providerKey === 'vault') return ['secret-c'];
				return [];
			});

			const connections = [
				{ providerKey: 'aws' },
				{ providerKey: 'vault' },
				{ providerKey: 'missing_from_cache' },
			] as unknown as SecretsProviderConnection[];

			expect(service.toSecretCompletionsResponse(connections)).toEqual({
				aws: ['secret-a', 'secret-b'],
				vault: ['secret-c'],
				missing_from_cache: [],
			});
		});

		it('should return empty object for empty connections', () => {
			expect(service.toSecretCompletionsResponse([])).toEqual({});
		});
	});
});
