import Container from 'typedi';
import { CacheService } from '@/services/cache.service';

const cacheService = Container.get(CacheService);

describe('cacheService (Mock)', () => {
	test('should prevent use of empty keys', async () => {
		const cache = await cacheService.getCache();
		expect(cache).toBeDefined();
		if (!cache) {
			throw new Error('cache is undefined');
		}

		const spyGet = jest.spyOn(cache.store, 'get').mockImplementation(() => {
			throw new Error('should not be called');
		});

		const spySet = jest.spyOn(cache.store, 'set').mockImplementation(() => {
			throw new Error('should not be called');
		});

		// confirm mock is working
		try {
			await cacheService.set('test', 'test');
		} catch {
			expect(spySet).toThrowError();
		}

		await cacheService.set('', 'test');

		await expect(cacheService.get('')).resolves.toBeUndefined();
		await cacheService.setMany([
			['', 'something'],
			['', 'something'],
		]);
		await expect(cacheService.getMany([''])).resolves.toStrictEqual([undefined]);
		await cacheService.setMany([]);
		await expect(cacheService.getMany([])).resolves.toStrictEqual([]);
		expect(spyGet).not.toHaveBeenCalled();
	});
});
