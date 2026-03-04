import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { sleep } from 'n8n-workflow';

import config from '@/config';
import { CacheService } from '@/services/cache/cache.service';

jest.mock('ioredis', () => {
	const Redis = require('ioredis-mock');

	return function (...args: unknown[]) {
		return new Redis(args);
	};
});

for (const backend of ['memory', 'redis'] as const) {
	describe(backend, () => {
		let cacheService: CacheService;
		let globalConfig: GlobalConfig;

		beforeAll(async () => {
			globalConfig = Container.get(GlobalConfig);
			globalConfig.cache.backend = backend;
			cacheService = new CacheService(globalConfig);
			await cacheService.init();
		});

		afterEach(async () => {
			await cacheService.reset();
			config.load(config.default);
		});

		describe('init', () => {
			test('should select backend based on config', () => {
				expect(cacheService.isMemory()).toBe(backend === 'memory');
				expect(cacheService.isRedis()).toBe(backend === 'redis');
			});

			if (backend === 'redis') {
				test('with auto backend and queue mode, should select redis', async () => {
					globalConfig.executions.mode = 'queue';

					await cacheService.init();

					expect(cacheService.isRedis()).toBe(true);
				});
			}

			if (backend === 'memory') {
				test('should honor max size when enough', async () => {
					globalConfig.cache.memory.maxSize = 16; // enough bytes for "withoutUnicode"

					await cacheService.init();
					await cacheService.set('key', 'withoutUnicode');

					await expect(cacheService.get('key')).resolves.toBe('withoutUnicode');

					// restore
					globalConfig.cache.memory.maxSize = 3 * 1024 * 1024;
					await cacheService.init();
				});

				test('should honor max size when not enough', async () => {
					globalConfig.cache.memory.maxSize = 16; // not enough bytes for "withUnicodeԱԲԳ"

					await cacheService.init();
					await cacheService.set('key', 'withUnicodeԱԲԳ');

					await expect(cacheService.get('key')).resolves.toBeUndefined();

					// restore
					globalConfig.cache.memory.maxSize = 3 * 1024 * 1024;
					// restore
					await cacheService.init();
				});
			}
		});

		describe('set', () => {
			test('should set a string value', async () => {
				await cacheService.set('key', 'value');

				await expect(cacheService.get('key')).resolves.toBe('value');
			});

			test('should set a number value', async () => {
				await cacheService.set('key', 123);

				await expect(cacheService.get('key')).resolves.toBe(123);
			});

			test('should set an object value', async () => {
				const object = { a: { b: { c: { d: 1 } } } };

				await cacheService.set('key', object);

				await expect(cacheService.get('key')).resolves.toMatchObject(object);
			});

			test('should not cache `null` or `undefined` values', async () => {
				await cacheService.set('key1', null);
				await cacheService.set('key2', undefined);
				await cacheService.set('key3', 'value');

				await expect(cacheService.get('key1')).resolves.toBeUndefined();
				await expect(cacheService.get('key2')).resolves.toBeUndefined();
				await expect(cacheService.get('key3')).resolves.toBe('value');
			});

			test('should disregard zero-length keys', async () => {
				await cacheService.set('', 'value');

				await expect(cacheService.get('')).resolves.toBeUndefined();
			});

			test('should honor ttl', async () => {
				await cacheService.set('key', 'value', 100);

				await expect(cacheService.get('key')).resolves.toBe('value');

				await sleep(200);

				await expect(cacheService.get('key')).resolves.toBeUndefined();
			});
		});

		describe('get', () => {
			test('should fall back to fallback value', async () => {
				const promise = cacheService.get('key', { fallbackValue: 'fallback' });
				await expect(promise).resolves.toBe('fallback');
			});

			test('should refresh value', async () => {
				const promise = cacheService.get('testString', {
					refreshFn: async () => 'refreshValue',
				});

				await expect(promise).resolves.toBe('refreshValue');
			});

			test('should handle non-ASCII key', async () => {
				const nonAsciiKey = 'ԱԲԳ';
				await cacheService.set(nonAsciiKey, 'value');

				await expect(cacheService.get(nonAsciiKey)).resolves.toBe('value');
			});

			test('should validate cached value and refresh if invalid', async () => {
				// Set an empty array in cache
				await cacheService.set('testArray', []);

				// Get with validation that rejects empty arrays
				const result = await cacheService.get<string[]>('testArray', {
					validateFn: (value) => Array.isArray(value) && value.length > 0,
					refreshFn: async () => ['item1', 'item2'],
				});

				// Should have refreshed and returned new value
				expect(result).toEqual(['item1', 'item2']);

				// Cache should now contain the refreshed value
				const cachedValue = await cacheService.get('testArray');
				expect(cachedValue).toEqual(['item1', 'item2']);
			});

			test('should use cached value if validation passes', async () => {
				// Set a non-empty array in cache
				await cacheService.set('testArray', ['existing1', 'existing2']);

				const refreshFn = jest.fn().mockResolvedValue(['new1', 'new2']);

				// Get with validation that accepts non-empty arrays
				const result = await cacheService.get<string[]>('testArray', {
					validateFn: (value) => Array.isArray(value) && value.length > 0,
					refreshFn,
				});

				// Should use cached value without calling refreshFn
				expect(result).toEqual(['existing1', 'existing2']);
				expect(refreshFn).not.toHaveBeenCalled();
			});

			test('should fall back to fallback value if validation fails and no refreshFn', async () => {
				// Set an empty array in cache
				await cacheService.set('testArray', []);

				// Get with validation but no refreshFn
				const result = await cacheService.get<string[]>('testArray', {
					validateFn: (value) => Array.isArray(value) && value.length > 0,
					fallbackValue: ['fallback1', 'fallback2'],
				});

				// Should return fallback value
				expect(result).toEqual(['fallback1', 'fallback2']);
			});

			test('should handle validation with complex objects', async () => {
				// Set an object with missing required field
				await cacheService.set('testObject', { name: 'test' });

				// Get with validation that requires 'value' field
				const result = await cacheService.get<{ name: string; value: string }>('testObject', {
					validateFn: (obj) => obj && 'value' in obj,
					refreshFn: async () => ({ name: 'test', value: 'refreshed' }),
				});

				// Should have refreshed
				expect(result).toEqual({ name: 'test', value: 'refreshed' });
			});
		});

		describe('delete', () => {
			test('should delete a key', async () => {
				await cacheService.set('key', 'value');

				await cacheService.delete('key');

				await expect(cacheService.get('key')).resolves.toBeUndefined();
			});
		});

		describe('setMany', () => {
			test('should set multiple string values', async () => {
				await cacheService.setMany([
					['key1', 'value1'],
					['key2', 'value2'],
				]);

				const promise = cacheService.getMany(['key1', 'key2']);
				await expect(promise).resolves.toStrictEqual(['value1', 'value2']);
			});

			test('should set multiple number values', async () => {
				await cacheService.setMany([
					['key1', 123],
					['key2', 456],
				]);

				const promise = cacheService.getMany(['key1', 'key2']);
				await expect(promise).resolves.toStrictEqual([123, 456]);
			});

			test('should disregard zero-length keys', async () => {
				await cacheService.setMany([['', 'value1']]);

				await expect(cacheService.get('')).resolves.toBeUndefined();
			});
		});

		describe('getMany', () => {
			test('should return undefined on missing result', async () => {
				await cacheService.setMany([
					['key1', 123],
					['key2', 456],
				]);

				const promise = cacheService.getMany(['key2', 'key3']);
				await expect(promise).resolves.toStrictEqual([456, undefined]);
			});
		});

		describe('delete', () => {
			test('should handle non-ASCII key', async () => {
				const nonAsciiKey = 'ԱԲԳ';
				await cacheService.set(nonAsciiKey, 'value');
				await expect(cacheService.get(nonAsciiKey)).resolves.toBe('value');

				await cacheService.delete(nonAsciiKey);

				await expect(cacheService.get(nonAsciiKey)).resolves.toBeUndefined();
			});
		});

		describe('setHash', () => {
			test('should set a hash if non-existing', async () => {
				await cacheService.setHash('keyW', { field: 'value' });

				await expect(cacheService.getHash('keyW')).resolves.toStrictEqual({ field: 'value' });
			});

			test('should add to a hash value if existing', async () => {
				await cacheService.setHash('key', { field1: 'value1' });
				await cacheService.setHash('key', { field2: 'value2' });

				await expect(cacheService.getHash('key')).resolves.toStrictEqual({
					field1: 'value1',
					field2: 'value2',
				});
			});
		});

		describe('deleteFromHash', () => {
			test('should delete a hash field', async () => {
				await cacheService.setHash('key', { field1: 'value1', field2: 'value2' });
				await cacheService.deleteFromHash('key', 'field1');

				await expect(cacheService.getHash('key')).resolves.toStrictEqual({ field2: 'value2' });
			});
		});

		describe('getHashValue', () => {
			test('should return a hash field value', async () => {
				await cacheService.setHash('key', { field1: 'value1', field2: 'value2' });

				await expect(cacheService.getHashValue('key', 'field1')).resolves.toBe('value1');
			});
		});
	});
}
