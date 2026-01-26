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

	describe('findOneByProviderKey', () => {
		it('should find connection by provider key', async () => {
			const mockConnection = {
				providerKey: 'awsSecretsManager',
				type: 'awsSecretsManager',
				encryptedSettings: '{}',
				isEnabled: true,
				projectAccess: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			entityManager.findOne.mockResolvedValueOnce(mockConnection);

			const result = await repository.findOneByProviderKey('awsSecretsManager');

			expect(entityManager.findOne).toHaveBeenCalledWith(SecretsProviderConnection, {
				where: { providerKey: 'awsSecretsManager' },
			});
			expect(result).toEqual(mockConnection);
		});

		it('should return null when connection not found', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repository.findOneByProviderKey('nonexistent');

			expect(entityManager.findOne).toHaveBeenCalledWith(SecretsProviderConnection, {
				where: { providerKey: 'nonexistent' },
			});
			expect(result).toBeNull();
		});
	});

	describe('updateByProviderKey', () => {
		it('should update connection by provider key', async () => {
			const updateResult = { affected: 1, raw: {}, generatedMaps: [] };

			entityManager.update.mockResolvedValueOnce(updateResult);

			const result = await repository.updateByProviderKey('awsSecretsManager', {
				isEnabled: false,
				encryptedSettings: '{"updated": true}',
			});

			expect(entityManager.update).toHaveBeenCalledWith(
				SecretsProviderConnection,
				{ providerKey: 'awsSecretsManager' },
				{
					isEnabled: false,
					encryptedSettings: '{"updated": true}',
					providerKey: 'awsSecretsManager',
				},
			);
			expect(result).toEqual(updateResult);
		});

		it('should return affected 0 when connection not found', async () => {
			const updateResult = { affected: 0, raw: {}, generatedMaps: [] };

			entityManager.update.mockResolvedValueOnce(updateResult);

			const result = await repository.updateByProviderKey('nonexistent', { isEnabled: true });

			expect(result.affected).toBe(0);
		});
	});

	describe('deleteByProviderKey', () => {
		it('should delete connection by provider key', async () => {
			const deleteResult = { affected: 1, raw: {} };

			entityManager.delete.mockResolvedValueOnce(deleteResult);

			const result = await repository.deleteByProviderKey('awsSecretsManager');

			expect(entityManager.delete).toHaveBeenCalledWith(SecretsProviderConnection, {
				providerKey: 'awsSecretsManager',
			});
			expect(result).toEqual(deleteResult);
		});

		it('should return affected 0 when connection not found', async () => {
			const deleteResult = { affected: 0, raw: {} };

			entityManager.delete.mockResolvedValueOnce(deleteResult);

			const result = await repository.deleteByProviderKey('nonexistent');

			expect(result.affected).toBe(0);
		});
	});
});
