import { Service } from '@n8n/di';
import { promises as dns } from 'node:dns';
import type { LookupOptions } from 'node:dns';

import { InMemoryDnsCache } from './in-memory-dns-cache.service';

export type DnsLookupOptions = Pick<LookupOptions, 'all' | 'family' | 'order'>;

type RequiredLookupOptions = Required<DnsLookupOptions>;

/** We don't get the TTL for the records from `dns.lookup`, so we use a short, conservative TTL */
const LOOKUP_CACHE_TTL_SECONDS = 1;

/**
 * DNS resolver that caches results via {@link InMemoryDnsCache}.
 *
 * Since `dns.lookup` does not expose record TTLs, cache entries are stored
 * with a short, conservative TTL.
 *
 * Concurrent resolve calls for the same hostname and options are coalesced so
 * only one DNS query is in-flight at a time per cache key.
 */
@Service()
export class DnsResolver {
	private readonly inFlightByCacheKey = new Map<string, Promise<string[]>>();

	constructor(private readonly dnsCache: InMemoryDnsCache) {}

	/**
	 * Lookup a hostname with `dns.lookup`-style options.
	 */
	async lookup(hostname: string, options: DnsLookupOptions = {}): Promise<string[]> {
		const normalized = this.normalizeOptions(options);
		const cacheKey = this.buildCacheKey(hostname, normalized);

		const cached = await this.dnsCache.get(cacheKey);
		if (cached) return cached;

		const existing = this.inFlightByCacheKey.get(cacheKey);
		if (existing) return await existing;

		const resolvePromise = (async () => {
			const addresses = await this.doLookup(hostname, normalized);
			if (addresses.length > 0) {
				await this.dnsCache.set(cacheKey, addresses, LOOKUP_CACHE_TTL_SECONDS);
			}

			return addresses;
		})();

		this.inFlightByCacheKey.set(cacheKey, resolvePromise);

		return await resolvePromise.finally(() => {
			this.inFlightByCacheKey.delete(cacheKey);
		});
	}

	private async doLookup(hostname: string, options: RequiredLookupOptions): Promise<string[]> {
		if (options.all) {
			const records = await dns.lookup(hostname, {
				all: true,
				family: options.family,
				order: options.order,
			});
			return [...new Set(records.map((record) => record.address))];
		}

		const record = await dns.lookup(hostname, {
			all: false,
			family: options.family,
			order: options.order,
		});

		return [record.address];
	}

	private buildCacheKey(hostname: string, options: RequiredLookupOptions): string {
		return `${hostname}|all:${options.all ? '1' : '0'}|family:${options.family}|order:${options.order}`;
	}

	private normalizeOptions(options: DnsLookupOptions): RequiredLookupOptions {
		const all = options.all === true;
		const familyInput = options.family;
		const family =
			familyInput === 4 || familyInput === 6 || familyInput === 0
				? familyInput
				: familyInput === 'IPv4'
					? 4
					: familyInput === 'IPv6'
						? 6
						: 0;
		const order = options.order ?? 'verbatim';
		return { all, family, order };
	}
}
