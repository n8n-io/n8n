import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import random from 'lodash/random';

import { SecretsProviderConnection } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { SecretsProviderConnectionRepository } from '../secrets-provider-connection.repository.ee';

describe('SecretsProviderConnectionRepository', () => {
	const entityManager = mockEntityManager(SecretsProviderConnection);
	const repository = Container.get(SecretsProviderConnectionRepository);
	const createMockConnection = (
		overrides: Partial<SecretsProviderConnection> = {},
	): SecretsProviderConnection => {
		return mock<SecretsProviderConnection>({
			id: random(1, Number.MAX_SAFE_INTEGER),
			providerKey: 'myVault',
			type: 'vault',
			encryptedSettings: '',
			isEnabled: false,
			projectAccess: [],
			...overrides,
		});
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('findAll', () => {
		it('should return all secrets provider connections', async () => {
			const mockConnections = [createMockConnection(), createMockConnection()];

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

	describe('findIdByProviderKey', () => {
		it('returns id when provider exists', async () => {
			entityManager.findOne.mockResolvedValueOnce(createMockConnection({ id: 42 }));

			const result = await repository.findIdByProviderKey('myVault');

			expect(entityManager.findOne).toHaveBeenCalledWith(SecretsProviderConnection, {
				select: ['id'],
				where: { providerKey: 'myVault' },
			});
			expect(result).toBe('42');
		});

		it('returns null when provider does not exist', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repository.findIdByProviderKey('missing');

			expect(result).toBeNull();
		});
	});

	describe('findIdsByProviderKeys', () => {
		it('returns ids as strings for matching providers', async () => {
			entityManager.find.mockResolvedValueOnce([
				createMockConnection({ id: 7 }),
				createMockConnection({ id: 8 }),
			] as SecretsProviderConnection[]);

			const result = await repository.findIdsByProviderKeys(['vault-a', 'vault-b']);

			expect(entityManager.find).toHaveBeenCalledWith(SecretsProviderConnection, {
				select: ['id'],
				where: { providerKey: expect.anything() },
			});
			expect(result).toEqual(['7', '8']);
		});

		it('returns empty list for empty input', async () => {
			const result = await repository.findIdsByProviderKeys([]);
			expect(result).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});
});
