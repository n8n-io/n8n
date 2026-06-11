import { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { MemoryCache } from 'cache-manager';
import { caching } from 'cache-manager';
import { jsonStringify } from 'n8n-workflow';
import assert from 'node:assert';
import { LookupAddress } from 'node:dns';

/**
 * In-memory DNS cache backed by LRU eviction and per-entry TTL.
 */
@Service()
export class InMemoryDnsCache {
	private cache: MemoryCache | undefined;

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
			});
		}

		return this.cache;
	}

	async get(hostname: string): Promise<LookupAddress[] | undefined> {
		const cache = await this.ensureCache();
		return await cache.get<LookupAddress[]>(hostname);
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
