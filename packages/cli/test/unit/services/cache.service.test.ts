import Container from 'typedi';
import { CacheService } from '@/services/cache.service';
import type { MemoryCache } from 'cache-manager';
// import type { RedisCache } from 'cache-manager-ioredis-yet';
import config from '@/config';

const cacheService = Container.get(CacheService);

describe('cacheService', () => {
	beforeEach(async () => {
		await Container.get(CacheService).uninit();
	});

	test('should create a memory cache by default', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');
		await cacheService.init();
		expect(cacheService.getCacheInstance()).toBeDefined();
		const candidate = cacheService.getCacheInstance() as MemoryCache;
		expect(candidate.store.size).toBeDefined();
	});

	test('should cache and retrieve a value', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');
		await cacheService.init();
		expect(cacheService.getCacheInstance()).toBeDefined();
		await cacheService.set<string>('testString', 'test');
		await cacheService.set<number>('testNumber', 123);

		expect(await cacheService.get<string>('testString')).toBe('test');
		expect(typeof (await cacheService.get<string>('testString'))).toBe('string');
		expect(await cacheService.get<number>('testNumber')).toBe(123);
		expect(typeof (await cacheService.get<number>('testNumber'))).toBe('number');
	});

	test('should honour ttl values', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');
		// set default TTL to 10ms
		config.set('cache.memory.ttl', 10);

		await cacheService.set<string>('testString', 'test');
		await cacheService.set<number>('testNumber', 123, 1000);

		expect(await cacheService.getCacheInstance()?.store.ttl('testString')).toBeLessThanOrEqual(100);
		expect(await cacheService.getCacheInstance()?.store.ttl('testNumber')).toBeLessThanOrEqual(
			1000,
		);

		expect(await cacheService.get<string>('testString')).toBe('test');
		expect(await cacheService.get<number>('testNumber')).toBe(123);

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(await cacheService.get<string>('testString')).toBeUndefined();
		expect(await cacheService.get<number>('testNumber')).toBe(123);
	});

	test('should set and remove values', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');

		await cacheService.set<string>('testString', 'test');
		expect(await cacheService.get<string>('testString')).toBe('test');
		await cacheService.del('testString');
		expect(await cacheService.get<string>('testString')).toBeUndefined();
	});

	test('should set and get complex objects', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');

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
		expect(await cacheService.get<TestObject>('testObject')).toMatchObject(testObject);
	});

	test('should set and get multiple values', async () => {
		config.set('executions.mode', 'regular');
		config.set('cache.backend', 'auto');

		await cacheService.mset<string>([
			['testString', 'test'],
			['testString2', 'test2'],
		]);
		await cacheService.mset<number>([
			['testNumber', 123],
			['testNumber2', 456],
		]);
		expect(await cacheService.mget<string>(['testString', 'testString2'])).toStrictEqual([
			'test',
			'test2',
		]);
		expect(await cacheService.mget<number>(['testNumber', 'testNumber2'])).toStrictEqual([
			123, 456,
		]);
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
