import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createHash } from 'crypto';
import { mock } from 'jest-mock-extended';
import { sleep } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import { SamlAssertionIdCache } from '../saml-assertion-id-cache';

jest.mock('ioredis', () => {
	const Redis = require('ioredis-mock');

	return function (...args: unknown[]) {
		return new Redis(args);
	};
});

const samlifyKey = (assertionId: string) =>
	JSON.stringify(['assertion', 'https://idp.example.com/metadata', assertionId]);

describe('SamlAssertionIdCache', () => {
	const cacheService = mock<CacheService>();
	const assertionIdCache = new SamlAssertionIdCache(cacheService);

	const key = samlifyKey('_assertion-id');
	const cacheKey = `saml:assertion:${createHash('sha256').update(key).digest('hex')}`;
	const now = new Date('2026-11-10T12:00:00.000Z');

	beforeEach(() => {
		jest.resetAllMocks();
		jest.useFakeTimers({ now });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('saves a new key until it expires', async () => {
		cacheService.get.mockResolvedValue(undefined);

		const saved = await assertionIdCache.saveIfAbsent(key, new Date(now.getTime() + 5 * 60_000));

		expect(saved).toBe(true);
		expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
		expect(cacheService.set).toHaveBeenCalledWith(cacheKey, '1', 5 * 60_000);
	});

	test('returns false for a key that is already saved', async () => {
		cacheService.get.mockResolvedValue('1');

		const saved = await assertionIdCache.saveIfAbsent(key, new Date(now.getTime() + 60_000));

		expect(saved).toBe(false);
		expect(cacheService.set).not.toHaveBeenCalled();
	});

	test('keeps a key for at least one second', async () => {
		cacheService.get.mockResolvedValue(undefined);

		await assertionIdCache.saveIfAbsent(key, new Date(now.getTime() - 60_000));

		expect(cacheService.set).toHaveBeenCalledWith(cacheKey, '1', 1000);
	});

	test('uses a cache key of fixed length', async () => {
		cacheService.get.mockResolvedValue(undefined);

		await assertionIdCache.saveIfAbsent('x'.repeat(10_000), new Date(now.getTime() + 60_000));

		const [savedKey] = cacheService.set.mock.calls[0];
		expect(savedKey).toMatch(/^saml:assertion:[0-9a-f]{64}$/);
	});
});

// The cache backends differ in how they report missing keys, so test with each of them
describe.each(['memory', 'redis'] as const)('SamlAssertionIdCache with the %s cache', (backend) => {
	let assertionIdCache: SamlAssertionIdCache;

	beforeAll(async () => {
		const globalConfig = Container.get(GlobalConfig);
		globalConfig.cache.backend = backend;
		const cacheService = new CacheService(globalConfig);
		await cacheService.init();
		expect(cacheService.isRedis()).toBe(backend === 'redis');
		assertionIdCache = new SamlAssertionIdCache(cacheService);
	});

	test('saves a key only once', async () => {
		const key = samlifyKey(`_${backend}-once`);
		const expiresAt = new Date(Date.now() + 60_000);

		expect(await assertionIdCache.saveIfAbsent(key, expiresAt)).toBe(true);
		expect(await assertionIdCache.saveIfAbsent(key, expiresAt)).toBe(false);
	});

	test('saves different keys independently', async () => {
		const expiresAt = new Date(Date.now() + 60_000);

		expect(await assertionIdCache.saveIfAbsent(samlifyKey(`_${backend}-a`), expiresAt)).toBe(true);
		expect(await assertionIdCache.saveIfAbsent(samlifyKey(`_${backend}-b`), expiresAt)).toBe(true);
	});

	test('saves a key again after it expires', async () => {
		const key = samlifyKey(`_${backend}-expired`);

		expect(await assertionIdCache.saveIfAbsent(key, new Date(Date.now() + 1000))).toBe(true);
		await sleep(1200);

		expect(await assertionIdCache.saveIfAbsent(key, new Date(Date.now() + 1000))).toBe(true);
	});
});
