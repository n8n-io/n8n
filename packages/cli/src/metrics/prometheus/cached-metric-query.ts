import type { JsonValue } from 'n8n-workflow';

import type { CacheService } from '@/services/cache/cache.service';

type CachedMetricQueryOpts<T extends JsonValue> = {
	cacheService: CacheService;
	cacheKey: string;
	ttlMs: number;
	query: () => Promise<T>;
};

/**
 * Serves a cached query result, refreshing on cache miss and caching the fresh
 * value with the given TTL. Concurrent `get()` calls are coalesced so a single
 * scrape's parallel gauge collects share one cache-read + query.
 */
export class CachedMetricQuery<T extends JsonValue> {
	private readonly cacheService: CacheService;
	private readonly cacheKey: string;
	private readonly ttlMs: number;
	private readonly query: () => Promise<T>;

	private inFlight: Promise<T> | null = null;

	constructor({ cacheService, cacheKey, ttlMs, query }: CachedMetricQueryOpts<T>) {
		this.cacheService = cacheService;
		this.cacheKey = cacheKey;
		this.ttlMs = ttlMs;
		this.query = query;
	}

	async get(): Promise<T> {
		this.inFlight ??= this.load().finally(() => {
			this.inFlight = null;
		});
		return await this.inFlight;
	}

	private async load(): Promise<T> {
		// We let the cache store handle the serialization and deserialization of the
		// value. In-memory cache stores it as is, redis does JSON stringify/parse.
		const cached = await this.cacheService.get<T>(this.cacheKey);
		if (cached !== undefined) return cached;

		const value = await this.query();
		await this.cacheService.set(this.cacheKey, value, this.ttlMs);
		return value;
	}
}
