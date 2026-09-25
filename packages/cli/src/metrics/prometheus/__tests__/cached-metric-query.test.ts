import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { CachedMetricQuery } from '../cached-metric-query';

describe('CachedMetricQuery', () => {
	const cacheService = mock<CacheService>();

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('returns the cached value without querying on a cache hit', async () => {
		cacheService.get.mockResolvedValue(42);
		const query = vi.fn();
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
		});

		expect(await cached.get()).toBe(42);
		expect(query).not.toHaveBeenCalled();
		expect(cacheService.set).not.toHaveBeenCalled();
	});

	it('queries, caches with the given TTL, and returns on a cache miss', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const query = vi.fn().mockResolvedValue(7);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 5000,
			query,
		});

		expect(await cached.get()).toBe(7);
		expect(query).toHaveBeenCalledTimes(1);
		expect(cacheService.set).toHaveBeenCalledWith('key', 7, 5000);
	});

	it('coalesces concurrent get() calls into a single query and cache read', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const query = vi.fn().mockResolvedValue(1);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
		});

		const [a, b] = await Promise.all([cached.get(), cached.get()]);

		expect(a).toBe(1);
		expect(b).toBe(1);
		expect(query).toHaveBeenCalledTimes(1);
		expect(cacheService.get).toHaveBeenCalledTimes(1);
	});

	it('queries again on a fresh get() after the previous one settled', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const query = vi.fn().mockResolvedValue(1);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
		});

		await cached.get();
		await cached.get();

		expect(query).toHaveBeenCalledTimes(2);
	});
});
