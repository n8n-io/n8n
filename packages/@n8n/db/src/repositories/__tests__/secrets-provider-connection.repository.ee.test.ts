import { Container } from '@n8n/di';

import { SecretsProviderConnection } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SecretsProviderConnectionRepository } from '../secrets-provider-connection.repository.ee';

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
					providerKey: 'awsSecretsManager',
					type: 'awsSecretsManager',
					encryptedSettings: '{}',
					isEnabled: true,
					projectAccess: [],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					providerKey: 'vault',
					type: 'vault',
					encryptedSettings: '{}',
					isEnabled: false,
					projectAccess: [],
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
