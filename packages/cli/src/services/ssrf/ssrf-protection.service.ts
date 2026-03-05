import { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { isIP } from 'node:net';
import type { BlockList, LookupFunction } from 'node:net';

import { DnsResolver } from './dns-resolver';
import { HostnameMatcher } from './hostname-matcher';
import { buildIpRangeList } from './ip-range-builder';
import { SsrfBlockedIpError } from './ssrf-blocked-ip.error';

export type SsrfCheckResult =
	| { allowed: true }
	| { allowed: false; reason: string; ip?: string; hostname?: string; url?: string };

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
	private readonly logger: Logger;

	private readonly blockedIps: BlockList;

	private readonly allowedIps: BlockList;

	private readonly allowedHostnameMatcher: HostnameMatcher;

	constructor(
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly dnsResolver: DnsResolver,
		logger: Logger,
	) {
		this.logger = logger.scoped('ssrf-protection');

		const blocked = buildIpRangeList(this.ssrfConfig.blockedIpRanges);
		for (const issue of blocked.issues) {
			this.logger.warn(
				`Invalid value '${issue.entry}' in N8N_SSRF_BLOCKED_IP_RANGES: ${issue.error}`,
			);
		}
		this.blockedIps = blocked.list;

		const allowed = buildIpRangeList(this.ssrfConfig.allowedIpRanges);
		for (const issue of allowed.issues) {
			this.logger.warn(
				`Invalid value '${issue.entry}' in N8N_SSRF_ALLOWED_IP_RANGES: ${issue.error}`,
			);
		}
		this.allowedIps = allowed.list;

		this.allowedHostnameMatcher = new HostnameMatcher(this.ssrfConfig.allowedHostnames);
	}

	/**
	 * Validate a URL by resolving its hostname and checking all resolved IPs.
	 * Direct IP URLs (e.g. http://127.0.0.1) are validated without DNS resolution.
	 */
	async validateUrl(url: string | URL): Promise<SsrfCheckResult> {
		const parsed = this.tryParseUrl(url);
		if (!parsed) {
			this.logger.debug('Failed to parse URL for SSRF validation', {
				url,
			});
			return { allowed: false, reason: 'Invalid URL', url: url ? String(url) : undefined };
		}

		const { hostname } = parsed;

		if (this.allowedHostnameMatcher.matches(hostname)) {
			return { allowed: true };
		}

		const cleanIp = this.normalizeIpInHostname(hostname);
		if (isIP(cleanIp)) {
			return this.validateAddress(cleanIp);
		}

		// Resolve hostname via DNS and validate all IPs
		const ips = await this.dnsResolver.lookup(hostname, { all: true });
		if (ips.length === 0) {
			return { allowed: false, reason: 'DNS resolution failed', hostname };
		}

		for (const ip of ips) {
			const result = this.validateAddress(ip.address);
			if (!result.allowed) {
				return result;
			}
		}

		return { allowed: true };
	}

	/**
	 * Validate a single IP address against the allowlist and blocklist.
	 */
	validateAddress(ip: string): SsrfCheckResult {
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
	 * Create a custom DNS lookup function that is a drop-in replacement for
	 * Node.js `dns.lookup`. It can be passed to `socket.connect({ lookup })`
	 * or `axios.request({ lookup })` to validate resolved IPs at connection
	 * time, preventing TOCTOU attacks.
	 *
	 * Lookup options (e.g. IP family) are forwarded as-is so Node.js internals
	 * can decide which addresses to resolve based on:
	 * - The `family` option passed directly to `socket.connect` or `axios.request`
	 * - The auto-select family setting (`dns.setDefaultAutoSelectFamily`)
	 */
	createSecureLookup(): LookupFunction {
		return async (hostname, options, onResult) => {
			try {
				const resolved = await this.secureLookupAsync(hostname, options);

				if (options.all) {
					onResult(null, resolved);
					return;
				}

				const first = resolved[0];
				onResult(null, first.address, first.family);
			} catch (error) {
				onResult(ensureError(error), options.all ? [] : '', undefined);
			}
		};
	}

	/**
	 * Validate a redirect target URL through the same validation flow.
	 */
	async validateRedirect(redirectUrl: string): Promise<SsrfCheckResult> {
		return await this.validateUrl(redirectUrl);
	}

	/**
	 * Normalize IPv6 bracket notation from a URL hostname.
	 * E.g. `[::1]` → `::1`, `127.0.0.1` → `127.0.0.1`.
	 */
	private normalizeIpInHostname(hostname: string): string {
		return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
	}

	private async secureLookupAsync(
		hostname: string,
		options: LookupOptions,
	): Promise<LookupAddress[]> {
		const resolved = await this.dnsResolver.lookup(hostname, options);

		if (this.allowedHostnameMatcher.matches(hostname)) {
			return resolved;
		}

		for (const ip of resolved) {
			const result = this.validateAddress(ip.address);
			if (!result.allowed) {
				throw new SsrfBlockedIpError(ip.address, hostname);
			}
		}

		return resolved;
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
}
