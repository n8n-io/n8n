import { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isIP } from 'node:net';
import type { BlockList } from 'node:net';

import { DnsResolver } from './dns-resolver';
import { HostnameMatcher } from './hostname-matcher';
import { buildBlocklist } from './ip-range-blocklist-builder';
import { SsrfBlockedIpError } from './ssrf-blocked-ip.error';
import { SsrfDnsResolutionError } from './ssrf-dns-resolution.error';

interface ResolvedAddress {
	address: string;
	family: number;
}

export type SsrfCheckResult =
	| { allowed: true }
	| { allowed: false; reason: string; ip?: string; hostname?: string };

/**
 * Validates outbound HTTP requests against configurable blocklists and allowlists
 * to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Validation precedence (highest to lowest):
 * 1. Hostname allowlist — if hostname matches, request is allowed
 * 2. IP allowlist — if IP matches allowed CIDR ranges, request is allowed
 * 3. IP blocklist — if IP matches blocked CIDR ranges, request is blocked
 * 4. Otherwise — request is allowed
 */
@Service()
export class SsrfProtectionService {
	private readonly blockedIps: BlockList;

	private readonly allowedIps: BlockList;

	private readonly hostnameMatcher: HostnameMatcher;

	constructor(
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly dnsResolver: DnsResolver,
		private readonly logger: Logger,
	) {
		const blocked = buildBlocklist(this.ssrfConfig.resolvedBlockedIpRanges);
		for (const issue of blocked.issues) this.logger.warn(`${issue.error}: ${issue.entry}`);
		this.blockedIps = blocked.blocklist;

		const allowed = buildBlocklist(this.ssrfConfig.allowedIpRanges);
		for (const issue of allowed.issues) this.logger.warn(`${issue.error}: ${issue.entry}`);
		this.allowedIps = allowed.blocklist;

		this.hostnameMatcher = new HostnameMatcher(this.ssrfConfig.allowedHostnames);
	}

	/**
	 * Validate a URL by resolving its hostname and checking all resolved IPs.
	 * Direct IP URLs (e.g. http://127.0.0.1) are validated without DNS resolution.
	 */
	async validateUrl(url: string | URL): Promise<SsrfCheckResult> {
		const parsed = this.tryParseUrl(url);
		if (!parsed) {
			return { allowed: false, reason: 'Invalid URL' };
		}

		const { hostname } = parsed;

		if (this.hostnameMatcher.matches(hostname)) {
			return { allowed: true };
		}

		const cleanIp = this.extractIpFromHostname(hostname);
		if (isIP(cleanIp)) {
			return this.validateIp(cleanIp);
		}

		// Resolve hostname via DNS and validate all IPs
		const ips = await this.dnsResolver.resolveAll(hostname);
		if (ips.length === 0) {
			return { allowed: false, reason: 'DNS resolution failed', hostname };
		}

		for (const ip of ips) {
			const result = this.validateIp(ip);
			if (!result.allowed) {
				return result;
			}
		}

		return { allowed: true };
	}

	/**
	 * Validate a single IP address against the allowlist and blocklist.
	 */
	validateIp(ip: string): SsrfCheckResult {
		const family = this.getIpFamily(ip);
		if (family === null) {
			return { allowed: false, reason: 'Invalid IP address', ip };
		}

		if (this.allowedIps.check(ip, family)) {
			return { allowed: true };
		}

		if (this.blockedIps.check(ip, family)) {
			return { allowed: false, reason: 'IP address is blocked', ip };
		}

		return { allowed: true };
	}

	/**
	 * Create a custom DNS lookup function for injection into HTTP clients.
	 * This is the single validation point that prevents TOCTOU attacks by
	 * validating IPs at connection time rather than before the request.
	 */
	createSecureLookup(): (
		hostname: string,
		options: { all?: boolean; family?: number },
		onResult: (
			error: NodeJS.ErrnoException | null,
			address: string | ResolvedAddress[],
			family?: number,
		) => void,
	) => void {
		return (hostname, options, onResult) => {
			this.secureLookupAsync(hostname, options)
				.then((resolved) => {
					if (options.all) {
						onResult(null, resolved.address);
					} else {
						const first = resolved.address[0];
						onResult(null, first.address, first.family);
					}
				})
				.catch((cause: Error) => {
					const error = Object.assign(new Error(cause.message), {
						code: 'ENOTFOUND',
						hostname,
					}) as NodeJS.ErrnoException;
					onResult(error, [], undefined);
				});
		};
	}

	/**
	 * Validate a redirect target URL through the same validation flow.
	 */
	async validateRedirect(redirectUrl: string): Promise<SsrfCheckResult> {
		return await this.validateUrl(redirectUrl);
	}

	/**
	 * Strip IPv6 bracket notation from a URL hostname.
	 * E.g. `[::1]` → `::1`, `127.0.0.1` → `127.0.0.1`.
	 */
	private extractIpFromHostname(hostname: string): string {
		return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
	}

	private async secureLookupAsync(
		hostname: string,
		options: { all?: boolean; family?: number },
	): Promise<{ address: ResolvedAddress[]; family: number }> {
		if (this.hostnameMatcher.matches(hostname)) {
			const ips = await this.dnsResolver.resolveAll(hostname);
			if (ips.length === 0) {
				throw new SsrfDnsResolutionError(hostname);
			}
			const resolved = this.filterByRequestedFamily(
				ips.map((ip) => this.toResolvedAddress(ip)),
				options.family,
			);
			if (resolved.length === 0) {
				throw new SsrfDnsResolutionError(hostname);
			}
			return {
				address: resolved,
				family: resolved[0].family,
			};
		}

		// Handle direct IP addresses
		const cleanIp = this.extractIpFromHostname(hostname);

		if (isIP(cleanIp)) {
			const result = this.validateIp(cleanIp);
			if (!result.allowed) {
				throw new SsrfBlockedIpError(cleanIp);
			}
			const family = isIP(cleanIp) === 6 ? 6 : 4;
			if ((options.family === 4 || options.family === 6) && options.family !== family) {
				throw new SsrfDnsResolutionError(hostname);
			}
			return {
				address: [{ address: cleanIp, family }],
				family,
			};
		}

		const ips = await this.dnsResolver.resolveAll(hostname);
		if (ips.length === 0) {
			throw new SsrfDnsResolutionError(hostname);
		}

		for (const ip of ips) {
			const result = this.validateIp(ip);
			if (!result.allowed) {
				throw new SsrfBlockedIpError(ip);
			}
		}

		const resolved = this.filterByRequestedFamily(
			ips.map((ip) => this.toResolvedAddress(ip)),
			options.family,
		);
		if (resolved.length === 0) {
			throw new SsrfDnsResolutionError(hostname);
		}

		return { address: resolved, family: resolved[0].family };
	}

	private tryParseUrl(url: string | URL): URL | null {
		try {
			return url instanceof URL ? url : new URL(url);
		} catch {
			return null;
		}
	}

	private getIpFamily(ip: string): 'ipv4' | 'ipv6' | null {
		const version = isIP(ip);
		if (version === 4) return 'ipv4';
		if (version === 6) return 'ipv6';
		return null;
	}

	private toResolvedAddress(ip: string): ResolvedAddress {
		return {
			address: ip,
			family: isIP(ip) === 6 ? 6 : 4,
		};
	}

	private filterByRequestedFamily(
		addresses: ResolvedAddress[],
		family?: number,
	): ResolvedAddress[] {
		if (family !== 4 && family !== 6) {
			return addresses;
		}

		return addresses.filter((address) => address.family === family);
	}
}
