import { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { SsrfBridge, SsrfCheckResult } from 'n8n-core';
import { createResultError, ensureError, Result, createResultOk } from 'n8n-workflow';
import assert from 'node:assert';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { isIP } from 'node:net';
import type { BlockList, LookupFunction } from 'node:net';

import { DnsResolver } from './dns-resolver';
import { HostnameMatcher } from './hostname-matcher';
import { buildIpRangeList } from './ip-range-builder';
import { SsrfBlockedIpError } from './ssrf-blocked-ip.error';

export type LookAndValidateResult = Result<LookupAddress[], Error>;

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
export class SsrfProtectionService implements SsrfBridge {
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
			return createResultError(new Error(`Invalid URL: ${url}`));
		}

		const { hostname } = parsed;

		const result = await this.lookupAndValidate(hostname, { all: true });
		if (!result.ok) {
			return result;
		}

		return createResultOk(undefined);
	}

	/**
	 * Validate a single IP address against the allowlist and blocklist.
	 */
	validateIp(ip: string): SsrfCheckResult {
		const family = this.getIpFamily(ip);
		assert(family !== null, `Invalid IP address: ${ip}`);

		if (this.allowedIps.check(ip, family)) {
			return createResultOk(undefined);
		}

		if (this.blockedIps.check(ip, family)) {
			return createResultError(new SsrfBlockedIpError(ip));
		}

		return createResultOk(undefined);
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
	 * Synchronous redirect validation for use in axios beforeRedirect callback.
	 * Validates direct-IP redirect targets immediately. Hostname-based redirect
	 * targets are covered by the secureLookup on the redirect agent.
	 * Throws SsrfBlockedIpError if the redirect target is blocked.
	 */
	validateRedirectSync(url: string): void {
		const parsed = this.tryParseUrl(url);
		if (!parsed) return;

		const { hostname } = parsed;

		if (this.allowedHostnameMatcher.matches(hostname)) return;

		const cleanIp = this.normalizeIpInHostname(hostname);
		if (isIP(cleanIp)) {
			const result = this.validateIp(cleanIp);
			if (!result.ok) {
				throw result.error;
			}
		}
	}

	/**
	 * Normalize IPv6 bracket notation from a URL hostname.
	 * E.g. `[::1]` -> `::1`, `127.0.0.1` -> `127.0.0.1`.
	 */
	private normalizeIpInHostname(hostname: string): string {
		return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
	}

	/**
	 * @throws {SsrfBlockedIpError} if any resolved IP is blocked
	 */
	private async secureLookupAsync(
		hostname: string,
		options: LookupOptions,
	): Promise<LookupAddress[]> {
		const result = await this.lookupAndValidate(hostname, options);
		if (!result.ok) {
			throw result.error;
		}

		return result.result;
	}

	/**
	 * Lookup a hostname and validate the resulting IP addresses. Direct IPs
	 * are validated without DNS resolution.
	 */
	private async lookupAndValidate(
		hostname: string,
		options: LookupOptions,
	): Promise<LookAndValidateResult> {
		const cleanIp = this.normalizeIpInHostname(hostname);
		const ipFamily = isIP(cleanIp);

		if (ipFamily) {
			// Direct IP, we don't need to lookup, just validate

			const result = this.validateIp(cleanIp);
			if (!result.ok) {
				return result;
			}

			return createResultOk([
				{
					address: cleanIp,
					family: ipFamily,
				},
			]);
		}

		// Hostname, we need to lookup first and then validate the IP(s)
		const resolved = await this.dnsResolver.lookup(hostname, options);
		// The resolves must always return result(s) or throw
		assert(resolved.length > 0, `DNS lookup for ${hostname} returned no results`);

		if (this.allowedHostnameMatcher.matches(hostname)) {
			return createResultOk(resolved);
		}

		for (const ip of resolved) {
			const result = this.validateIp(ip.address);
			if (!result.ok) {
				return result;
			}
		}

		return createResultOk(resolved);
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
