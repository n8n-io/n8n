import { TypedEmitter } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { MemoryCache } from 'cache-manager';
import { caching } from 'cache-manager';
import { jsonStringify } from 'n8n-workflow';
import assert from 'node:assert';
import type { LookupAddress } from 'node:dns';

export type DnsCacheEventMap = {
	hit: undefined;
	miss: undefined;
	eviction: { size: number };
};

/**
 * In-memory DNS cache backed by LRU eviction and per-entry TTL.
 */
@Service()
export class InMemoryDnsCache {
	private cache: MemoryCache | undefined;

	readonly events = new TypedEmitter<DnsCacheEventMap>();

	constructor(private readonly ssrfConfig: SsrfProtectionConfig) {}

	private async ensureCache(): Promise<MemoryCache> {
		if (!this.cache) {
			const sizeCalculation = (item: unknown) => {
				const str = jsonStringify(item, { replaceCircularRefs: true });
				return new TextEncoder().encode(str).length;
			};

			this.cache = await caching('memory', {
				maxSize: this.ssrfConfig.dnsCacheMaxSize,
				sizeCalculation,
				ttl: 0,
				ttlResolution: 0,
				dispose: (_value, _key, reason) => {
					if (reason === 'evict') {
						// dispose fires before the entry is removed from the size counter,
						// so subtract 1 to report the post-eviction size.
						this.events.emit('eviction', { size: Math.max(this.size - 1, 0) });
					}
				},
			});
		}

		return this.cache;
	}

	get size(): number {
		return this.cache?.store?.size ?? 0;
	}

	async get(hostname: string): Promise<LookupAddress[] | undefined> {
		const cache = await this.ensureCache();
		const result = await cache.get<LookupAddress[]>(hostname);
		this.events.emit(result !== undefined ? 'hit' : 'miss');
		return result;
	}

	/**
	 * @param hostname The hostname to cache
	 * @param ips Resolved IP addresses
	 * @param ttl TTL in seconds
	 */
	async set(hostname: string, ips: LookupAddress[], ttl: number): Promise<void> {
		assert(ttl > 0, 'DNS cache TTL must be greater than 0');

		const cache = await this.ensureCache();
		const ttlMs = ttl * Time.seconds.toMilliseconds;
		await cache.set(hostname, ips, ttlMs);
	}

	async clear(): Promise<void> {
		const cache = await this.ensureCache();
		await cache.reset();
	}
}
