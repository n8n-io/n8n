import { Service } from '@n8n/di';
import { promises as dns } from 'node:dns';

import { InMemoryDnsCache } from './in-memory-dns-cache.service';

/**
 * DNS resolver that caches results via {@link InMemoryDnsCache}.
 *
 * Resolves A records first, falling back to AAAA if no A records exist.
 * TTL is derived from the minimum TTL across all returned records.
 *
 * Concurrent resolve calls for the same hostname are coalesced so only
 * one DNS query is in-flight at a time per hostname.
 */
@Service()
export class DnsResolver {
	private readonly inFlightByHostname = new Map<string, Promise<string[]>>();

	constructor(private readonly dnsCache: InMemoryDnsCache) {}

	/**
	 * Resolve a hostname using A records first, then AAAA as fallback.
	 */
	async resolve(hostname: string): Promise<string[]> {
		return await this.resolveWithCache(hostname, async () => await this.doResolve(hostname));
	}

	/**
	 * Resolve a hostname across both A and AAAA records.
	 */
	async resolveAll(hostname: string): Promise<string[]> {
		return await this.resolveWithCache(
			`all:${hostname}`,
			async () => await this.doResolveAll(hostname),
		);
	}

	private async resolveWithCache(
		cacheKey: string,
		resolver: () => Promise<string[]>,
	): Promise<string[]> {
		const cached = await this.dnsCache.get(cacheKey);
		if (cached) return cached;

		const existing = this.inFlightByHostname.get(cacheKey);
		if (existing) return await existing;

		const promise = resolver();
		this.inFlightByHostname.set(cacheKey, promise);

		return await promise.finally(() => {
			this.inFlightByHostname.delete(cacheKey);
		});
	}

	private async doResolve(hostname: string): Promise<string[]> {
		const ipv4Result = await this.resolveIpv4(hostname);
		if (ipv4Result.length > 0) {
			return ipv4Result;
		}

		return await this.resolveIpv6(hostname);
	}

	private async doResolveAll(hostname: string): Promise<string[]> {
		const [ipv4Result, ipv6Result] = await Promise.all([
			this.resolveIpv4Internal(hostname, null),
			this.resolveIpv6Internal(hostname, null),
		]);
		const combined = [...new Set([...ipv4Result.records, ...ipv6Result.records])];
		if (combined.length === 0) {
			return [];
		}

		const minTtlInSecs = Math.max(1, Math.min(...[...ipv4Result.ttls, ...ipv6Result.ttls]));
		await this.dnsCache.set(`all:${hostname}`, combined, minTtlInSecs);
		return combined;
	}

	private async resolveIpv4(hostname: string): Promise<string[]> {
		const result = await this.resolveIpv4Internal(hostname, hostname);
		return result.records;
	}

	private async resolveIpv4Internal(
		hostname: string,
		cacheKey: string | null,
	): Promise<{ records: string[]; ttls: number[] }> {
		try {
			const records = await dns.resolve4(hostname, { ttl: true });
			const minTtlInSecs = Math.max(1, Math.min(...records.map((r) => r.ttl)));
			const ips = records.map((r) => r.address);
			if (cacheKey !== null) {
				await this.dnsCache.set(cacheKey, ips, minTtlInSecs);
			}
			return { records: ips, ttls: records.map((r) => r.ttl) };
		} catch {
			return { records: [], ttls: [] };
		}
	}

	private async resolveIpv6(hostname: string): Promise<string[]> {
		const result = await this.resolveIpv6Internal(hostname, hostname);
		return result.records;
	}

	private async resolveIpv6Internal(
		hostname: string,
		cacheKey: string | null,
	): Promise<{ records: string[]; ttls: number[] }> {
		try {
			const records = await dns.resolve6(hostname, { ttl: true });
			const minTtlInSecs = Math.max(1, Math.min(...records.map((r) => r.ttl)));
			const ips = records.map((r) => r.address);
			if (cacheKey !== null) {
				await this.dnsCache.set(cacheKey, ips, minTtlInSecs);
			}
			return { records: ips, ttls: records.map((r) => r.ttl) };
		} catch {
			return { records: [], ttls: [] };
		}
	}
}
