import { mockLogger } from '@n8n/backend-test-utils';
import type { SecretsProviderConnection, SecretsProviderConnectionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { DeleteResult, UpdateResult } from '@n8n/typeorm';

import { SecretsProviderConnectionStoreCache } from '../secrets-provider-connection-store-cache.service';

describe('SecretsProviderConnectionStoreCache', () => {
	let cache: SecretsProviderConnectionStoreCache;
	let mockRepository: ReturnType<typeof mock<SecretsProviderConnectionRepository>>;

	const createMockConnection = (
		overrides: Partial<SecretsProviderConnection> = {},
	): SecretsProviderConnection =>
		({
			providerKey: 'awsSecretsManager',
			type: 'awsSecretsManager',
			encryptedSettings: '{}',
			isEnabled: true,
			projectAccess: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		}) as SecretsProviderConnection;

	beforeEach(() => {
		mockRepository = mock<SecretsProviderConnectionRepository>();
		cache = new SecretsProviderConnectionStoreCache(mockLogger(), mockRepository);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('reloadAll', () => {
		it('should load all connections into cache', async () => {
			const connections = [
				createMockConnection({ providerKey: 'aws' }),
				createMockConnection({ providerKey: 'vault' }),
			];

			mockRepository.findAll.mockResolvedValueOnce(connections);

			const result = await cache.reloadAll();

			expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
			expect(result).toEqual(connections);
		});

		it('should clear existing cache before loading', async () => {
			const initialConnections = [createMockConnection({ providerKey: 'initial' })];
			const newConnections = [createMockConnection({ providerKey: 'new' })];

			mockRepository.findAll.mockResolvedValueOnce(initialConnections);
			await cache.reloadAll();

			mockRepository.findAll.mockResolvedValueOnce(newConnections);
			await cache.reloadAll();

			const cachedConnections = await cache.getCachedConnections();
			expect(cachedConnections).toHaveLength(1);
			expect(cachedConnections[0].providerKey).toBe('new');
		});

		it('should handle empty database', async () => {
			mockRepository.findAll.mockResolvedValueOnce([]);

			const result = await cache.reloadAll();

			expect(result).toEqual([]);
		});
	});

	describe('getCachedConnections', () => {
		it('should initialize cache on first access', async () => {
			const connections = [createMockConnection()];
			mockRepository.findAll.mockResolvedValueOnce(connections);

			const result = await cache.getCachedConnections();

			expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
			expect(result).toEqual(connections);
		});

		it('should not reload cache on subsequent access', async () => {
			mockRepository.findAll.mockResolvedValueOnce([createMockConnection()]);

			await cache.getCachedConnections();
			await cache.getCachedConnections();

			expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
		});

		it('should return all cached connections', async () => {
			const connections = [
				createMockConnection({ providerKey: 'aws' }),
				createMockConnection({ providerKey: 'vault' }),
				createMockConnection({ providerKey: 'azure' }),
			];
			mockRepository.findAll.mockResolvedValueOnce(connections);

			const result = await cache.getCachedConnections();

			expect(result).toHaveLength(3);
		});
	});

	describe('getCachedConnectionByProviderKey', () => {
		it('should return connection when found in cache', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findAll.mockResolvedValueOnce([connection]);

			const result = await cache.getCachedConnectionByProviderKey('aws');

			expect(result).toEqual(connection);
		});

		it('should return undefined when not found in cache', async () => {
			mockRepository.findAll.mockResolvedValueOnce([createMockConnection({ providerKey: 'aws' })]);

			const result = await cache.getCachedConnectionByProviderKey('nonexistent');

			expect(result).toBeUndefined();
		});

		it('should initialize cache if not initialized', async () => {
			mockRepository.findAll.mockResolvedValueOnce([createMockConnection()]);

			await cache.getCachedConnectionByProviderKey('aws');

			expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
		});
	});

	describe('reloadConnection', () => {
		it('should reload connection from database and update cache', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(connection);

			const result = await cache.reloadConnection('aws');

			expect(mockRepository.findOneByProviderKey).toHaveBeenCalledWith('aws');
			expect(result).toEqual(connection);
		});

		it('should add new connection to cache', async () => {
			mockRepository.findAll.mockResolvedValueOnce([]);
			await cache.getCachedConnections();

			const newConnection = createMockConnection({ providerKey: 'new' });
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(newConnection);

			await cache.reloadConnection('new');

			const cached = await cache.getCachedConnectionByProviderKey('new');
			expect(cached).toEqual(newConnection);
		});

		it('should remove connection from cache when not found in database', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findAll.mockResolvedValueOnce([connection]);
			await cache.getCachedConnections();

			mockRepository.findOneByProviderKey.mockResolvedValueOnce(null);

			const result = await cache.reloadConnection('aws');

			expect(result).toBeNull();
			const cached = await cache.getCachedConnectionByProviderKey('aws');
			expect(cached).toBeUndefined();
		});
	});

	describe('create', () => {
		it('should save connection to database and add to cache', async () => {
			const connection = createMockConnection({ providerKey: 'new' });
			mockRepository.create.mockReturnValueOnce(connection);
			mockRepository.save.mockResolvedValueOnce(connection);
			mockRepository.findAll.mockResolvedValueOnce([]);

			const result = await cache.create(connection);

			expect(mockRepository.create).toHaveBeenCalledWith(connection);
			expect(mockRepository.save).toHaveBeenCalledWith(connection);
			expect(result).toEqual(connection);
		});

		it('should add saved connection to cache', async () => {
			const connection = createMockConnection({ providerKey: 'new' });

			// Initialize cache first
			mockRepository.findAll.mockResolvedValueOnce([]);
			await cache.getCachedConnections();

			mockRepository.create.mockReturnValueOnce(connection);
			mockRepository.save.mockResolvedValueOnce(connection);

			await cache.create(connection);

			const cached = await cache.getCachedConnectionByProviderKey('new');
			expect(cached).toEqual(connection);
		});
	});

	describe('update', () => {
		it('should update connection in database and cache when rows affected', async () => {
			const connection = createMockConnection({ providerKey: 'aws', isEnabled: false });
			const updatedConnection = createMockConnection({ providerKey: 'aws', isEnabled: false });

			mockRepository.updateByProviderKey.mockResolvedValueOnce({
				affected: 1,
			} as UpdateResult);
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(updatedConnection);
			mockRepository.findAll.mockResolvedValueOnce([]);

			const result = await cache.update(connection);

			expect(mockRepository.updateByProviderKey).toHaveBeenCalledWith('aws', connection);
			expect(result).toEqual(updatedConnection);
		});

		it('should update cache with reloaded connection after update', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			const updatedConnection = createMockConnection({
				providerKey: 'aws',
				encryptedSettings: '{"updated": true}',
			});

			// Initialize cache first
			mockRepository.findAll.mockResolvedValueOnce([connection]);
			await cache.getCachedConnections();

			mockRepository.updateByProviderKey.mockResolvedValueOnce({
				affected: 1,
			} as UpdateResult);
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(updatedConnection);

			await cache.update(connection);

			const cached = await cache.getCachedConnectionByProviderKey('aws');
			expect(cached?.encryptedSettings).toBe('{"updated": true}');
		});

		it('should handle no rows affected but connection exists', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });

			mockRepository.updateByProviderKey.mockResolvedValueOnce({
				affected: 0,
			} as UpdateResult);
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(connection);
			mockRepository.findAll.mockResolvedValueOnce([]);

			const result = await cache.update(connection);

			expect(result).toEqual(connection);
		});

		it('should remove from cache when connection no longer exists', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findAll.mockResolvedValueOnce([connection]);
			await cache.getCachedConnections();

			mockRepository.updateByProviderKey.mockResolvedValueOnce({
				affected: 0,
			} as UpdateResult);
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(null);

			await cache.update(connection);

			const cached = await cache.getCachedConnectionByProviderKey('aws');
			expect(cached).toBeUndefined();
		});
	});

	describe('delete', () => {
		it('should delete connection from database and cache', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findAll.mockResolvedValueOnce([connection]);
			await cache.getCachedConnections();

			mockRepository.deleteByProviderKey.mockResolvedValueOnce({
				affected: 1,
			} as DeleteResult);

			await cache.delete('aws');

			expect(mockRepository.deleteByProviderKey).toHaveBeenCalledWith('aws');
			const cached = await cache.getCachedConnectionByProviderKey('aws');
			expect(cached).toBeUndefined();
		});

		it('should not remove from cache when delete affects no rows', async () => {
			const connection = createMockConnection({ providerKey: 'aws' });
			mockRepository.findAll.mockResolvedValueOnce([connection]);
			await cache.getCachedConnections();

			mockRepository.deleteByProviderKey.mockResolvedValueOnce({
				affected: 0,
			} as DeleteResult);

			await cache.delete('nonexistent');

			const cached = await cache.getCachedConnectionByProviderKey('aws');
			expect(cached).toEqual(connection);
		});
	});

	describe('integration scenarios', () => {
		it('should maintain cache consistency across CRUD operations', async () => {
			// Initialize cache first (empty)
			mockRepository.findAll.mockResolvedValueOnce([]);
			await cache.getCachedConnections();

			// Create a connection
			const newConnection = createMockConnection({ providerKey: 'test' });
			mockRepository.create.mockReturnValueOnce(newConnection);
			mockRepository.save.mockResolvedValueOnce(newConnection);
			await cache.create(newConnection);

			// Verify it's in cache
			let cached = await cache.getCachedConnectionByProviderKey('test');
			expect(cached).toEqual(newConnection);

			// Update the connection
			const updatedConnection = createMockConnection({
				providerKey: 'test',
				isEnabled: false,
			});
			mockRepository.updateByProviderKey.mockResolvedValueOnce({ affected: 1 } as UpdateResult);
			mockRepository.findOneByProviderKey.mockResolvedValueOnce(updatedConnection);
			await cache.update(updatedConnection);

			// Verify update in cache
			cached = await cache.getCachedConnectionByProviderKey('test');
			expect(cached?.isEnabled).toBe(false);

			// Delete the connection
			mockRepository.deleteByProviderKey.mockResolvedValueOnce({ affected: 1 } as DeleteResult);
			await cache.delete('test');

			// Verify removal from cache
			cached = await cache.getCachedConnectionByProviderKey('test');
			expect(cached).toBeUndefined();
		});

		it('should handle multiple connections in cache', async () => {
			const connections = [
				createMockConnection({ providerKey: 'aws' }),
				createMockConnection({ providerKey: 'vault' }),
				createMockConnection({ providerKey: 'azure' }),
			];
			mockRepository.findAll.mockResolvedValueOnce(connections);

			await cache.reloadAll();

			const allCached = await cache.getCachedConnections();
			expect(allCached).toHaveLength(3);

			const awsCached = await cache.getCachedConnectionByProviderKey('aws');
			expect(awsCached?.providerKey).toBe('aws');

			const vaultCached = await cache.getCachedConnectionByProviderKey('vault');
			expect(vaultCached?.providerKey).toBe('vault');
		});
	});
});
