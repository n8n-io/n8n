import { Container } from '@n8n/di';

import { SecretsProviderConnection } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SecretsProviderConnectionRepository } from '../secrets-provider-connection.repository';

describe('SecretsProviderConnectionRepository', () => {
	const entityManager = mockEntityManager(SecretsProviderConnection);
	const repository = Container.get(SecretsProviderConnectionRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findAll', () => {
		it('should return all secrets provider connections', async () => {
			const mockConnections = [
				{
					id: '1',
					name: 'awsSecretsManager',
					displayName: 'AWS Secrets Manager',
					type: 'awsSecretsManager',
					settings: '{}',
					connected: true,
					connectedAt: new Date('2024-01-01'),
					state: 'connected',
					shared: [],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: '2',
					name: 'vault',
					displayName: 'HashiCorp Vault',
					type: 'vault',
					settings: '{}',
					connected: false,
					connectedAt: null,
					state: 'initializing',
					shared: [],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			entityManager.find.mockResolvedValueOnce(mockConnections);

			const result = await repository.findAll();

			expect(entityManager.find).toHaveBeenCalledWith(SecretsProviderConnection, undefined);
			expect(result).toEqual(mockConnections);
		});

		it('should return empty array when no connections exist', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			const result = await repository.findAll();

			expect(entityManager.find).toHaveBeenCalledWith(SecretsProviderConnection, undefined);
			expect(result).toEqual([]);
		});
	});
});
