import Container from 'typedi';
import { CacheService } from '@/services/cache.service';
import type { MemoryCache } from 'cache-manager';
// import type { RedisCache } from 'cache-manager-ioredis-yet';
import config from '@/config';

const cacheService = Container.get(CacheService);

function setDefaultConfig() {
	config.set('executions.mode', 'regular');
	config.set('cache.backend', 'auto');
	config.set('cache.memory.maxSize', 1 * 1024 * 1024);
}

describe('cacheService', () => {
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
		await cacheService.set<string>('testString', 'test');
		await cacheService.set<number>('testNumber', 123);

		await expect(cacheService.get<string>('testString')).resolves.toBe('test');
		expect(typeof (await cacheService.get<string>('testString'))).toBe('string');
		await expect(cacheService.get<number>('testNumber')).resolves.toBe(123);
		expect(typeof (await cacheService.get<number>('testNumber'))).toBe('number');
	});

	test('should honour ttl values', async () => {
		// set default TTL to 10ms
		config.set('cache.memory.ttl', 10);

		await cacheService.set<string>('testString', 'test');
		await cacheService.set<number>('testNumber', 123, 1000);

		const store = (await cacheService.getCache())?.store;

		expect(store).toBeDefined();

		await expect(store!.ttl('testString')).resolves.toBeLessThanOrEqual(100);
		await expect(store!.ttl('testNumber')).resolves.toBeLessThanOrEqual(1000);

		await expect(cacheService.get<string>('testString')).resolves.toBe('test');
		await expect(cacheService.get<number>('testNumber')).resolves.toBe(123);

		await new Promise((resolve) => setTimeout(resolve, 20));

		await expect(cacheService.get<string>('testString')).resolves.toBeUndefined();
		await expect(cacheService.get<number>('testNumber')).resolves.toBe(123);
	});

	test('should set and remove values', async () => {
		await cacheService.set<string>('testString', 'test');
		await expect(cacheService.get<string>('testString')).resolves.toBe('test');
		await cacheService.delete('testString');
		await expect(cacheService.get<string>('testString')).resolves.toBeUndefined();
	});

	test('should calculate maxSize', async () => {
		config.set('cache.memory.maxSize', 16);
		await cacheService.destroy();

		// 16 bytes because stringify wraps the string in quotes, so 2 bytes for the quotes
		await cacheService.set<string>('testString', 'withoutUnicode');
		await expect(cacheService.get<string>('testString')).resolves.toBe('withoutUnicode');

		await cacheService.destroy();

		// should not fit!
		await cacheService.set<string>('testString', 'withUnicodeԱԲԳ');
		await expect(cacheService.get<string>('testString')).resolves.toBeUndefined();
	});

	test('should set and get complex objects', async () => {
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

		await cacheService.set<TestObject>('testObject', testObject);
		await expect(cacheService.get<TestObject>('testObject')).resolves.toMatchObject(testObject);
	});

	test('should set and get multiple values', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');

		await cacheService.setMany<string>([
			['testString', 'test'],
			['testString2', 'test2'],
		]);
		await cacheService.setMany<number>([
			['testNumber', 123],
			['testNumber2', 456],
		]);
		await expect(
			cacheService.getMany<string>(['testString', 'testString2']),
		).resolves.toStrictEqual(['test', 'test2']);
		await expect(
			cacheService.getMany<number>(['testNumber', 'testNumber2']),
		).resolves.toStrictEqual([123, 456]);
	});
	// This test is skipped because it requires the Redis service
	// test('should create a redis cache if asked', async () => {
	// 	config.set('cache.backend', 'redis');
	// 	await cacheService.init();
	// 	expect(cacheService.getCacheInstance()).toBeDefined();
	// 	const candidate = cacheService.getCacheInstance() as RedisCache;
	// 	expect(candidate.store.client).toBeDefined();
	// });
});
