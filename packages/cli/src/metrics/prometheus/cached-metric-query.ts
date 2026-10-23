import { DbConnection } from '@n8n/db';
import { Service } from '@n8n/di';
import type { JsonValue } from 'n8n-workflow';

import { CacheService } from '@n8n/backend-services';

type CachedMetricQueryOpts<T extends JsonValue> = {
	cacheService: CacheService;
	cacheKey: string;
	ttlMs: number;
	query: () => Promise<T>;
	isDatabaseConnected: () => boolean;
};

/**
 * Converts a query result to a gauge value. An unavailable result becomes `NaN`,
 * which Prometheus reads as an unknown value.
 */
export function toGaugeValue<T>(value: T | undefined, select: (value: T) => number): number {
	return value === undefined ? NaN : select(value);
}

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
	private readonly isDatabaseConnected: () => boolean;

	private inFlight: Promise<T | undefined> | null = null;

	constructor({
		cacheService,
		cacheKey,
		ttlMs,
		query,
		isDatabaseConnected,
	}: CachedMetricQueryOpts<T>) {
		this.cacheService = cacheService;
		this.cacheKey = cacheKey;
		this.ttlMs = ttlMs;
		this.query = query;
		this.isDatabaseConnected = isDatabaseConnected;
	}

	async get(): Promise<T | undefined> {
		try {
			// Read the cache directly to avoid waiting for a query started before disconnection.
			if (!this.isDatabaseConnected()) {
				return await this.readCache();
			}
			this.inFlight ??= this.load().finally(() => {
				this.inFlight = null;
			});
			return await this.inFlight;
		} catch (error) {
			if (!this.isDatabaseConnected()) {
				return undefined;
			}
			throw error;
		}
	}

	private async load(): Promise<T | undefined> {
		const cached = await this.readCache();
		if (cached !== undefined) return cached;

		// A scrape must not wait for database recovery to finish.
		if (!this.isDatabaseConnected()) {
			return undefined;
		}

		const value = await this.query();
		await this.cacheService.set(this.cacheKey, value, this.ttlMs);
		return value;
	}

	private async readCache(): Promise<T | undefined> {
		return await this.cacheService.get<T>(this.cacheKey);
	}
}

/** Creates cached metric queries that skip the database while it is disconnected. */
@Service()
export class CachedMetricQueryFactory {
	constructor(
		private readonly cacheService: CacheService,
		private readonly dbConnection: DbConnection,
	) {}

	create<T extends JsonValue>(
		opts: Pick<CachedMetricQueryOpts<T>, 'cacheKey' | 'ttlMs' | 'query'>,
	): CachedMetricQuery<T> {
		return new CachedMetricQuery({
			...opts,
			cacheService: this.cacheService,
			isDatabaseConnected: () => this.dbConnection.connectionState.connected,
		});
	}
}
