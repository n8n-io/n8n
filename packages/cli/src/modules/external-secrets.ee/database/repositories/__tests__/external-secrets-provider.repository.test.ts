import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { ExternalSecretsProvider } from '../../entities/external-secrets-provider.entity';
import { ExternalSecretsProviderRepository } from '../external-secrets-provider.repository';

describe('ExternalSecretsProviderRepository', () => {
	let repository: ExternalSecretsProviderRepository;
	let mockDataSource: DataSource;
	let mockEntityManager: jest.Mocked<EntityManager>;

	beforeEach(() => {
		mockEntityManager = mock<EntityManager>();

		mockDataSource = mock<DataSource>({
			manager: mockEntityManager,
		});

		repository = new ExternalSecretsProviderRepository(mockDataSource);
	});

	describe('findAll', () => {
		it('should return all providers', async () => {
			const mockProviders: ExternalSecretsProvider[] = [
				{
					id: 'provider-1',
					name: 'vault-provider',
					displayName: 'Vault Provider',
					type: 'vault',
					projectId: null,
					settings: '{}',
					connected: true,
					connectedAt: new Date(),
					state: 'connected',
					createdAt: new Date(),
					updatedAt: new Date(),
				} as ExternalSecretsProvider,
				{
					id: 'provider-2',
					name: 'aws-provider',
					displayName: 'AWS Provider',
					type: 'awsSecretsManager',
					projectId: 'project-1',
					settings: '{}',
					connected: false,
					connectedAt: null,
					state: 'initializing',
					createdAt: new Date(),
					updatedAt: new Date(),
				} as ExternalSecretsProvider,
			];

			jest.spyOn(repository, 'find').mockResolvedValue(mockProviders);

			const result = await repository.findAll();

			expect(result).toEqual(mockProviders);
			expect(result).toHaveLength(2);
			expect(repository.find).toHaveBeenCalledWith();
		});

		it('should return empty array when no providers exist', async () => {
			jest.spyOn(repository, 'find').mockResolvedValue([]);

			const result = await repository.findAll();

			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
			expect(repository.find).toHaveBeenCalledWith();
		});
	});
});
