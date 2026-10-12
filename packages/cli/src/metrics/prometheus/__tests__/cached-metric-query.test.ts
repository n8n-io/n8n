import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@n8n/backend-services';

import { CachedMetricQuery, toGaugeValue } from '../cached-metric-query';

describe('CachedMetricQuery', () => {
	let connected: boolean;
	const cacheService = mock<CacheService>();

	beforeEach(() => {
		connected = true;
	});

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
			isDatabaseConnected: () => connected,
		});

		expect(await cached.get()).toBe(42);
		expect(query).not.toHaveBeenCalled();
		expect(cacheService.set).not.toHaveBeenCalled();
	});

	it('skips database queries during disconnection and resumes after recovery', async () => {
		const query = vi.fn().mockResolvedValue(7);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});
		connected = false;
		cacheService.get.mockResolvedValue(undefined);

		await expect(cached.get()).resolves.toBeUndefined();
		expect(query).not.toHaveBeenCalled();

		connected = true;
		await expect(cached.get()).resolves.toBe(7);
	});

	it('returns the cached value during disconnection', async () => {
		cacheService.get.mockResolvedValue(42);
		const query = vi.fn();
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});
		connected = false;

		await expect(cached.get()).resolves.toBe(42);
		expect(query).not.toHaveBeenCalled();
	});

	it('skips the query when the database disconnects during a cache read', async () => {
		const pendingCacheRead = createDeferredPromise<number | undefined>();
		cacheService.get.mockReturnValueOnce(pendingCacheRead.promise);
		const query = vi.fn().mockResolvedValue(7);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});

		const read = cached.get();
		connected = false;
		pendingCacheRead.resolve(undefined);

		await expect(read).resolves.toBeUndefined();
		expect(query).not.toHaveBeenCalled();
		expect(cacheService.set).not.toHaveBeenCalled();
	});

	it('skips a failed query when the database disconnects during collection', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const query = vi.fn(async () => {
			connected = false;
			throw new Error('connection lost');
		});
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});

		await expect(cached.get()).resolves.toBeUndefined();
	});

	it('returns no value for concurrent cache failures during disconnection', async () => {
		connected = false;
		cacheService.get.mockRejectedValue(new Error('cache unavailable'));
		const query = vi.fn();
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});

		await expect(Promise.all([cached.get(), cached.get()])).resolves.toEqual([
			undefined,
			undefined,
		]);
		expect(query).not.toHaveBeenCalled();
	});

	it('reports concurrent cache failures while the database is connected', async () => {
		const error = new Error('cache unavailable');
		cacheService.get.mockRejectedValue(error);
		const query = vi.fn();
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});

		await expect(Promise.allSettled([cached.get(), cached.get()])).resolves.toEqual([
			{ status: 'rejected', reason: error },
			{ status: 'rejected', reason: error },
		]);
		expect(query).not.toHaveBeenCalled();
	});

	it.each(['resolves', 'rejects'] as const)(
		'resumes collection after a pending query %s during disconnection',
		async (outcome) => {
			cacheService.get.mockResolvedValue(undefined);
			const pendingQuery = createDeferredPromise<number>();
			const queryStarted = createDeferredPromise();
			const query = vi
				.fn<() => Promise<number>>()
				.mockImplementationOnce(async () => {
					queryStarted.resolve();
					return await pendingQuery.promise;
				})
				.mockResolvedValue(9);
			const cached = new CachedMetricQuery<number>({
				cacheService,
				cacheKey: 'key',
				ttlMs: 1000,
				query,
				isDatabaseConnected: () => connected,
			});
			const firstRead = cached.get();
			await queryStarted.promise;

			try {
				connected = false;
				await expect(cached.get()).resolves.toBeUndefined();
				expect(query).toHaveBeenCalledTimes(1);

				if (outcome === 'resolves') {
					pendingQuery.resolve(7);
					await expect(firstRead).resolves.toBe(7);
				} else {
					pendingQuery.reject(new Error('connection lost'));
					await expect(firstRead).resolves.toBeUndefined();
				}

				connected = true;
				await expect(cached.get()).resolves.toBe(9);
				expect(query).toHaveBeenCalledTimes(2);
				expect(cacheService.set).toHaveBeenLastCalledWith('key', 9, 1000);
			} finally {
				pendingQuery.resolve(7);
				await firstRead;
			}
		},
	);

	it('reports query errors while the database is connected', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const error = new Error('query failed');
		const query = vi.fn().mockRejectedValue(error);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 1000,
			query,
			isDatabaseConnected: () => connected,
		});

		await expect(cached.get()).rejects.toBe(error);
	});

	it('queries, caches with the given TTL, and returns on a cache miss', async () => {
		cacheService.get.mockResolvedValue(undefined);
		const query = vi.fn().mockResolvedValue(7);
		const cached = new CachedMetricQuery<number>({
			cacheService,
			cacheKey: 'key',
			ttlMs: 5000,
			query,
			isDatabaseConnected: () => connected,
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
			isDatabaseConnected: () => connected,
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
			isDatabaseConnected: () => connected,
		});

		await cached.get();
		await cached.get();

		expect(query).toHaveBeenCalledTimes(2);
	});
});

describe('toGaugeValue', () => {
	it('returns NaN for an unavailable value', () => {
		const select = vi.fn();

		expect(toGaugeValue<number>(undefined, select)).toBeNaN();
		expect(select).not.toHaveBeenCalled();
	});

	it('returns the selected number for an available value', () => {
		expect(toGaugeValue({ pending: 3 }, (snapshot) => snapshot.pending)).toBe(3);
	});
});
