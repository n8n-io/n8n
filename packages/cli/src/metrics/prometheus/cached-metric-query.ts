import type { CacheService } from '@/services/cache/cache.service';

/**
 * Serves a cached query result, refreshing on cache miss and caching the fresh
 * value with the given TTL. Concurrent `get()` calls are coalesced so a single
 * scrape's parallel gauge collects share one cache-read + query.
 */
export class CachedMetricQuery<T> {
	private inFlight: Promise<T> | null = null;

	constructor(
		private readonly cacheService: CacheService,
		private readonly key: string,
		private readonly ttlMs: number,
		private readonly query: () => Promise<T>,
	) {}

	async get(): Promise<T> {
		this.inFlight ??= this.load().finally(() => {
			this.inFlight = null;
		});
		return await this.inFlight;
	}

	private async load(): Promise<T> {
		const cached = await this.cacheService.get<T>(this.key);
		if (cached !== undefined) return cached;

		const value = await this.query();
		await this.cacheService.set(this.key, value, this.ttlMs);
		return value;
	}
}
