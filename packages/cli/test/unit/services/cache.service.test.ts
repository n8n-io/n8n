import Container from 'typedi';
import { CacheService } from '@/services/cache.service';
import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from 'cache-manager-ioredis-yet';
import config from '@/config';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';

const cacheService = Container.get(CacheService);

function setDefaultConfig() {
	config.set('executions.mode', 'regular');
	config.set('cache.enabled', true);
	config.set('cache.backend', 'memory');
	config.set('cache.memory.maxSize', 1 * 1024 * 1024);
}

interface TestObject {
	test: string;
	test2: number;
	test3?: TestObject & { test4: TestObject };
}

const testObject: TestObject = {
	test: 'test',
	test2: 123,
	test3: {
		test: 'test3',
		test2: 123,
		test4: {
			test: 'test4',
			test2: 123,
		},
	},
};

describe('cacheService', () => {
	beforeAll(async () => {
		LoggerProxy.init(getLogger());
		jest.mock('ioredis', () => {
			const Redis = require('ioredis-mock');
			if (typeof Redis === 'object') {
				// the first mock is an ioredis shim because ioredis-mock depends on it
				// https://github.com/stipsan/ioredis-mock/blob/master/src/index.js#L101-L111
				return {
					Command: { _transformer: { argument: {}, reply: {} } },
				};
			}
			// second mock for our code
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return function (...args: any) {
				return new Redis(args);
			};
		});
	});

	beforeEach(async () => {
		setDefaultConfig();
		await Container.get(CacheService).destroy();
	});

	test('should create a memory cache by default', async () => {
		await cacheService.init();
		await expect(cacheService.getCache()).resolves.toBeDefined();
		const candidate = (await cacheService.getCache()) as MemoryCache;
		// type guard to check that a MemoryCache is returned and not a RedisCache (which does not have a size property)
		expect(candidate.store.size).toBeDefined();
	});

	test('should cache and retrieve a value', async () => {
		await cacheService.init();
		await expect(cacheService.getCache()).resolves.toBeDefined();
		await cacheService.set('testString', 'test');
		await cacheService.set('testNumber1', 123);

		await expect(cacheService.get('testString')).resolves.toBe('test');
		expect(typeof (await cacheService.get('testString'))).toBe('string');
		await expect(cacheService.get('testNumber1')).resolves.toBe(123);
		expect(typeof (await cacheService.get('testNumber1'))).toBe('number');
	});

	test('should honour ttl values', async () => {
		// set default TTL to 10ms
		config.set('cache.memory.ttl', 10);

		await cacheService.set('testString', 'test');
		await cacheService.set('testNumber1', 123, 1000);

		const store = (await cacheService.getCache())?.store;

		expect(store).toBeDefined();

		await expect(store!.ttl('testString')).resolves.toBeLessThanOrEqual(100);
		await expect(store!.ttl('testNumber1')).resolves.toBeLessThanOrEqual(1000);

		// commented out because it fails on CI sporadically
		// await expect(cacheService.get('testString')).resolves.toBe('test');
		// await expect(cacheService.get('testNumber1')).resolves.toBe(123);

		// await new Promise((resolve) => setTimeout(resolve, 20));

		// await expect(cacheService.get('testString')).resolves.toBeUndefined();
		// await expect(cacheService.get('testNumber1')).resolves.toBe(123);
	});

	test('should set and remove values', async () => {
		await cacheService.set('testString', 'test');
		await expect(cacheService.get('testString')).resolves.toBe('test');
		await cacheService.delete('testString');
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
	});

	test('should calculate maxSize', async () => {
		config.set('cache.memory.maxSize', 16);
		await cacheService.destroy();

		// 16 bytes because stringify wraps the string in quotes, so 2 bytes for the quotes
		await cacheService.set('testString', 'withoutUnicode');
		await expect(cacheService.get('testString')).resolves.toBe('withoutUnicode');

		await cacheService.destroy();

		// should not fit!
		await cacheService.set('testString', 'withUnicodeԱԲԳ');
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
	});

	test('should set and get complex objects', async () => {
		await cacheService.set('testObject', testObject);
		await expect(cacheService.get('testObject')).resolves.toMatchObject(testObject);
	});

	test('should set and get multiple values', async () => {
		await cacheService.destroy();
		expect(cacheService.isRedisCache()).toBe(false);

		await cacheService.setMany([
			['testString', 'test'],
			['testString2', 'test2'],
		]);
		await cacheService.setMany([
			['testNumber1', 123],
			['testNumber2', 456],
		]);
		await expect(cacheService.getMany(['testString', 'testString2'])).resolves.toStrictEqual([
			'test',
			'test2',
		]);
		await expect(cacheService.getMany(['testNumber1', 'testNumber2'])).resolves.toStrictEqual([
			123, 456,
		]);
	});

	test('should create a redis in queue mode', async () => {
		config.set('cache.backend', 'auto');
		config.set('executions.mode', 'queue');
		await cacheService.destroy();
		await cacheService.init();

		const cache = await cacheService.getCache();
		await expect(cacheService.getCache()).resolves.toBeDefined();
		const candidate = (await cacheService.getCache()) as RedisCache;
		expect(candidate.store.client).toBeDefined();
	});

	test('should create a redis cache if asked', async () => {
		config.set('cache.backend', 'redis');
		config.set('executions.mode', 'queue');
		await cacheService.destroy();
		await cacheService.init();

		const cache = await cacheService.getCache();
		await expect(cacheService.getCache()).resolves.toBeDefined();
		const candidate = (await cacheService.getCache()) as RedisCache;
		expect(candidate.store.client).toBeDefined();
	});

	test('should get/set/delete redis cache', async () => {
		config.set('cache.backend', 'redis');
		config.set('executions.mode', 'queue');
		await cacheService.destroy();
		await cacheService.init();

		await cacheService.set('testObject', testObject);
		await expect(cacheService.get('testObject')).resolves.toMatchObject(testObject);
		await cacheService.delete('testObject');
		await expect(cacheService.get('testObject')).resolves.toBeUndefined();
	});

	// NOTE: mset and mget are not supported by ioredis-mock
	// test('should set and get multiple values with redis', async () => {
	// });

	test('should return fallback value if key is not set', async () => {
		await cacheService.reset();
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
		await expect(
			cacheService.get('testString', {
				fallbackValue: 'fallback',
			}),
		).resolves.toBe('fallback');
	});

	test('should call refreshFunction if key is not set', async () => {
		await cacheService.reset();
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
		await expect(
			cacheService.get('testString', {
				refreshFunction: async () => 'refreshed',
				fallbackValue: 'this should not be returned',
			}),
		).resolves.toBe('refreshed');
	});

	test('should transparently handle disabled cache', async () => {
		await cacheService.disable();
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
		await cacheService.set('testString', 'whatever');
		await expect(cacheService.get('testString')).resolves.toBeUndefined();
		await expect(
			cacheService.get('testString', {
				fallbackValue: 'fallback',
			}),
		).resolves.toBe('fallback');
		await expect(
			cacheService.get('testString', {
				refreshFunction: async () => 'refreshed',
				fallbackValue: 'this should not be returned',
			}),
		).resolves.toBe('refreshed');
	});

	test('should set and get partial results', async () => {
		await cacheService.setMany([
			['testNumber1', 123],
			['testNumber2', 456],
		]);
		await expect(cacheService.getMany(['testNumber1', 'testNumber2'])).resolves.toStrictEqual([
			123, 456,
		]);
		await expect(cacheService.getMany(['testNumber3', 'testNumber2'])).resolves.toStrictEqual([
			undefined,
			456,
		]);
	});

	test('should getMany and fix partial results and set single key', async () => {
		await cacheService.setMany([
			['testNumber1', 123],
			['testNumber2', 456],
		]);
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2', 'testNumber3']),
		).resolves.toStrictEqual([123, 456, undefined]);
		await expect(cacheService.get('testNumber3')).resolves.toBeUndefined();
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2', 'testNumber3'], {
				async refreshFunctionEach(key) {
					return key === 'testNumber3' ? 789 : undefined;
				},
			}),
		).resolves.toStrictEqual([123, 456, 789]);
		await expect(cacheService.get('testNumber3')).resolves.toBe(789);
	});

	test('should getMany and set all keys', async () => {
		await cacheService.setMany([
			['testNumber1', 123],
			['testNumber2', 456],
		]);
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2', 'testNumber3']),
		).resolves.toStrictEqual([123, 456, undefined]);
		await expect(cacheService.get('testNumber3')).resolves.toBeUndefined();
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2', 'testNumber3'], {
				async refreshFunctionMany(keys) {
					return [111, 222, 333];
				},
			}),
		).resolves.toStrictEqual([111, 222, 333]);
		await expect(cacheService.get('testNumber1')).resolves.toBe(111);
		await expect(cacheService.get('testNumber2')).resolves.toBe(222);
		await expect(cacheService.get('testNumber3')).resolves.toBe(333);
	});

	test('should set and get multiple values with fallbackValue', async () => {
		await cacheService.disable();
		await cacheService.setMany([
			['testNumber1', 123],
			['testNumber2', 456],
		]);
		await expect(cacheService.getMany(['testNumber1', 'testNumber2'])).resolves.toStrictEqual([
			undefined,
			undefined,
		]);
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2'], {
				fallbackValues: [123, 456],
			}),
		).resolves.toStrictEqual([123, 456]);
		await expect(
			cacheService.getMany(['testNumber1', 'testNumber2'], {
				refreshFunctionMany: async () => [123, 456],
				fallbackValues: [0, 1],
			}),
		).resolves.toStrictEqual([123, 456]);
	});

	test('should deal with unicode keys', async () => {
		const key = '? > ":< ! withUnicodeԱԲԳ';
		await cacheService.set(key, 'test');
		await expect(cacheService.get(key)).resolves.toBe('test');
		await cacheService.delete(key);
		await expect(cacheService.get(key)).resolves.toBeUndefined();
	});

	test('should deal with unicode keys in redis', async () => {
		config.set('cache.backend', 'redis');
		config.set('executions.mode', 'queue');
		await cacheService.destroy();
		await cacheService.init();
		const key = '? > ":< ! withUnicodeԱԲԳ';

		expect(((await cacheService.getCache()) as RedisCache).store.client).toBeDefined();

		await cacheService.set(key, 'test');
		await expect(cacheService.get(key)).resolves.toBe('test');
		await cacheService.delete(key);
		await expect(cacheService.get(key)).resolves.toBeUndefined();
	});

	test('should not cache null or undefined values', async () => {
		await cacheService.set('nullValue', null);
		await cacheService.set('undefValue', undefined);
		await cacheService.set('normalValue', 'test');

		await expect(cacheService.get('normalValue')).resolves.toBe('test');
		await expect(cacheService.get('undefValue')).resolves.toBeUndefined();
		await expect(cacheService.get('nullValue')).resolves.toBeUndefined();
	});

	test('should handle setting empty keys', async () => {
		await cacheService.set('', null);
		await expect(cacheService.get('')).resolves.toBeUndefined();
		await cacheService.setMany([
			['', 'something'],
			['', 'something'],
		]);
		await expect(cacheService.getMany([''])).resolves.toStrictEqual([undefined]);
		await cacheService.setMany([]);
		await expect(cacheService.getMany([])).resolves.toStrictEqual([]);
	});

	test('should handle setting empty keys (redis)', async () => {
		config.set('cache.backend', 'redis');
		config.set('executions.mode', 'queue');
		await cacheService.destroy();
		await cacheService.init();

		await cacheService.set('', null);
		await expect(cacheService.get('')).resolves.toBeUndefined();
		await cacheService.setMany([
			['', 'something'],
			['', 'something'],
		]);
		await expect(cacheService.getMany([''])).resolves.toStrictEqual([undefined]);
		await cacheService.setMany([]);
		await expect(cacheService.getMany([])).resolves.toStrictEqual([]);
	});
});
