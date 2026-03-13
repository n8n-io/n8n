import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { CacheService } from '@/services/cache/cache.service';

const cacheService = Container.get(CacheService);
const store = mock<NonNullable<CacheService['cache']>['store']>({ isCacheable: () => true });
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

		test('set', async () => {
			await cacheService.set('', '');
			expect(store.set).not.toHaveBeenCalled();

			await cacheService.set('key', 'value');
			expect(store.set).toHaveBeenCalledWith('key', 'value', undefined);

			await cacheService.set('key', 'value', 123);
			expect(store.set).toHaveBeenCalledWith('key', 'value', 123);

			await cacheService.set('false-key', false);
			expect(store.set).toHaveBeenCalledWith('false-key', false, undefined);

			await cacheService.set('zero-key', 0);
			expect(store.set).toHaveBeenCalledWith('zero-key', 0, undefined);

			await cacheService.set('empty-string-key', '');
			expect(store.set).toHaveBeenCalledWith('empty-string-key', '', undefined);
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
