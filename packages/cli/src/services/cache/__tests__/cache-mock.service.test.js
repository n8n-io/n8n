'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const cache_service_1 = require('@/services/cache/cache.service');
const cacheService = di_1.Container.get(cache_service_1.CacheService);
const store = (0, jest_mock_extended_1.mock)({ isCacheable: () => true });
Object.assign(cacheService, { cache: { store } });
describe('CacheService (Mock)', () => {
	beforeEach(() => jest.clearAllMocks());
	describe('should prevent use of empty keys', () => {
		test('get', async () => {
			await cacheService.get('');
			expect(store.get).not.toHaveBeenCalled();
			await cacheService.get('key');
			expect(store.get).toHaveBeenCalledWith('key');
		});
		test('getMany', async () => {
			await cacheService.getMany([]);
			expect(store.mget).not.toHaveBeenCalled();
			await cacheService.getMany(['key1', 'key2']);
			expect(store.mget).toHaveBeenCalledWith('key1', 'key2');
		});
		test('set', async () => {
			await cacheService.set('', '');
			expect(store.set).not.toHaveBeenCalled();
			await cacheService.set('key', 'value');
			expect(store.set).toHaveBeenCalledWith('key', 'value', undefined);
			await cacheService.set('key', 'value', 123);
			expect(store.set).toHaveBeenCalledWith('key', 'value', 123);
		});
		test('setMany', async () => {
			await cacheService.setMany([]);
			expect(store.mset).not.toHaveBeenCalled();
			await cacheService.setMany([['key', 'value']]);
			expect(store.mset).toHaveBeenCalledWith([['key', 'value']], undefined);
			await cacheService.setMany([['key', 'value']], 123);
			expect(store.mset).toHaveBeenCalledWith([['key', 'value']], 123);
		});
		test('delete', async () => {
			await cacheService.delete('');
			expect(store.del).not.toHaveBeenCalled();
			await cacheService.delete('key');
			expect(store.del).toHaveBeenCalledWith('key');
		});
		test('deleteMany', async () => {
			await cacheService.deleteMany([]);
			expect(store.mdel).not.toHaveBeenCalled();
			await cacheService.deleteMany(['key1', 'key2']);
			expect(store.mdel).toHaveBeenCalledWith('key1', 'key2');
		});
	});
});
//# sourceMappingURL=cache-mock.service.test.js.map
