import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import random from 'lodash/random';
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
				describe('when backend is redis', () => {
					test('with auto backend and queue mode, should select redis', async () => {
						globalConfig.executions.mode = 'queue';

						await cacheService.init();

						expect(cacheService.isRedis()).toBe(true);
					});
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
				await cacheService.set('key4', false);
				await cacheService.set('key5', 0);
				await cacheService.set('key6', '');

				await expect(cacheService.get('key1')).resolves.toBeUndefined();
				await expect(cacheService.get('key2')).resolves.toBeUndefined();
				await expect(cacheService.get('key3')).resolves.toBe('value');
				await expect(cacheService.get('key4')).resolves.toBe(false);
				await expect(cacheService.get('key5')).resolves.toBe(0);
				await expect(cacheService.get('key6')).resolves.toBe('');
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
			const createRefreshFn = () => jest.fn(async () => await Promise.resolve('refreshValue'));

			test('should fall back to fallback value', async () => {
				const promise = cacheService.get('key', { fallbackValue: 'fallback' });
				await expect(promise).resolves.toBe('fallback');
			});

			test('should refresh value', async () => {
				const refreshFn = createRefreshFn();
				const promise = cacheService.get('testString', { refreshFn });

				await expect(promise).resolves.toBe('refreshValue');
			});

			test('should handle non-ASCII key', async () => {
				const nonAsciiKey = 'ԱԲԳ';
				await cacheService.set(nonAsciiKey, 'value');

				await expect(cacheService.get(nonAsciiKey)).resolves.toBe('value');
			});

			test('should treat empty array placeholder as cache hit when key is present', async () => {
				const refreshFn = createRefreshFn();

				await cacheService.set('testString', []);
				const value = await cacheService.get('testString', { refreshFn });
				expect(value).toEqual([]);
				expect(refreshFn).not.toHaveBeenCalled();
			});

			if (backend === 'redis') {
				describe('when backend is redis', () => {
					test('should treat empty array placeholder as cache miss when key is missing', async () => {
						const refreshFn = createRefreshFn();

						const value = await cacheService.get('testString', { refreshFn });
						expect(value).toBe('refreshValue');
						expect(refreshFn).toHaveBeenCalledTimes(1);
					});

					test.each([
						['an empty array', []],
						['an array with items', ['item1', 'item2']],
						['a string', 'value'],
						['an empty string', ''],
						['a number', random(1, 1000)],
						['a zero', 0],
						['"true"', true],
						['"false"', false],
						['an object', { foo: 'bar' }],
						['an empty object', {}],
					])('should treat a key as cache hit when value is %s', async (_type, valueToSet) => {
						const refreshFn = createRefreshFn();

						await cacheService.set('testString', valueToSet);
						const value = await cacheService.get('testString', { refreshFn });
						expect(value).toEqual(valueToSet);
						expect(refreshFn).not.toHaveBeenCalled();
					});
				});
			}
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

				await expect(cacheService.get('key1')).resolves.toBe('value1');
				await expect(cacheService.get('key2')).resolves.toBe('value2');
			});

			test('should set multiple number values', async () => {
				await cacheService.setMany([
					['key1', 123],
					['key2', 456],
				]);

				await expect(cacheService.get('key1')).resolves.toBe(123);
				await expect(cacheService.get('key2')).resolves.toBe(456);
			});

			test('should disregard zero-length keys', async () => {
				await cacheService.setMany([['', 'value1']]);

				await expect(cacheService.get('')).resolves.toBeUndefined();
			});
		});

		describe('getHash', () => {
			const createHashRefreshFn = () =>
				jest.fn(async (_key: string) => await Promise.resolve({ field: 'refreshValue' }));

			test('should treat hash as cache hit when key is present', async () => {
				const refreshFn = createHashRefreshFn();
				await cacheService.setHash('testHash', { field: 'value' });

				const value = await cacheService.getHash('testHash', { refreshFn });
				expect(value).toEqual({ field: 'value' });
				expect(refreshFn).not.toHaveBeenCalled();
			});

			if (backend === 'redis') {
				describe('when backend is redis', () => {
					test('should treat empty hash placeholder as cache miss when key is missing', async () => {
						const refreshFn = createHashRefreshFn();
						await expect(cacheService.getHash('testHash', { refreshFn })).resolves.toEqual({
							field: 'refreshValue',
						});
						expect(refreshFn).toHaveBeenCalledTimes(1);
					});
				});
			}
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
