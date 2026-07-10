import { Service } from '@n8n/di';
import { promises as dns } from 'node:dns';
import type { LookupAddress, LookupOptions } from 'node:dns';

import { InMemoryDnsCache } from './in-memory-dns-cache.service';

export type DnsLookupOptions = Pick<
	LookupOptions,
	'all' | 'family' | 'order' | 'verbatim' | 'hints'
>;

interface NormalizedLookupOptions {
	all: boolean;
	family: 4 | 6 | 0;
	order?: LookupOptions['order'];
	verbatim?: boolean;
	hints?: number;
}

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
	private readonly inFlightByCacheKey = new Map<string, Promise<LookupAddress[]>>();

	constructor(private readonly dnsCache: InMemoryDnsCache) {}

	/**
	 * Lookup a hostname with `dns.lookup`-style options.
	 */
	async lookup(hostname: string, options: DnsLookupOptions = {}): Promise<LookupAddress[]> {
		const normalized = this.normalizeOptions(options);
		const cacheKey = this.buildCacheKey(hostname, normalized);

		const cached = await this.dnsCache.get(cacheKey);
		if (cached) return cached;

		const existing = this.inFlightByCacheKey.get(cacheKey);
		if (existing) return await existing;

		const lookupPromise = (async () => {
			const addresses = await this.doLookup(hostname, normalized);
			if (addresses.length > 0) {
				await this.dnsCache.set(cacheKey, addresses, LOOKUP_CACHE_TTL_SECONDS);
			}

			return addresses;
		})();

		this.inFlightByCacheKey.set(cacheKey, lookupPromise);

		return await lookupPromise.finally(() => {
			this.inFlightByCacheKey.delete(cacheKey);
		});
	}

	private async doLookup(
		hostname: string,
		options: NormalizedLookupOptions,
	): Promise<LookupAddress[]> {
		if (options.all) {
			const records = await dns.lookup(hostname, {
				all: true,
				family: options.family,
				order: options.order,
				verbatim: options.verbatim,
				hints: options.hints,
			});
			return records;
		}

		const record = await dns.lookup(hostname, {
			all: false,
			family: options.family,
			order: options.order,
			verbatim: options.verbatim,
			hints: options.hints,
		});

		return [record];
	}

	private buildCacheKey(hostname: string, options: NormalizedLookupOptions): string {
		const order = options.order ?? '-';
		const verbatim = options.verbatim === undefined ? '-' : options.verbatim ? '1' : '0';
		return `${hostname}|a:${options.all ? '1' : '0'}|f:${options.family}|o:${order}|v:${verbatim}|h:${options.hints ?? 0}`;
	}

	private normalizeOptions(options: DnsLookupOptions): NormalizedLookupOptions {
		const all = options.all === true;
		const family = this.normalizeIpFamily(options.family);
		const order = options.order;
		const verbatim = options.verbatim;
		return { all, family, order, verbatim, hints: options.hints };
	}

	private normalizeIpFamily(family: DnsLookupOptions['family']): 4 | 6 | 0 {
		if (family === 4 || family === 6 || family === 0) {
			return family;
		}
		if (family === 'IPv4') {
			return 4;
		}
		if (family === 'IPv6') {
			return 6;
		}
		return 0;
	}
}
