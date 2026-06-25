import { Logger, TypedEmitter } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createResultError, createResultOk, ensureError, Result } from 'n8n-workflow';
import assert from 'node:assert';
import type { LookupAddress, LookupOptions } from 'node:dns';
import type { BlockList, LookupFunction } from 'node:net';
import { isIP } from 'node:net';

import { DnsResolver } from '../dns';
import { HostnameMatcher } from './hostname-matcher';
import { buildIpRangeList } from './ip-range-builder';
import { SsrfBlockedHostnameError } from './ssrf-blocked-hostname.error';
import { SsrfBlockedIpError } from './ssrf-blocked-ip.error';

export type SsrfCheckResult = Result<void, Error>;

type SsrfBlockedReason = 'blocked_ip' | 'blocked_hostname' | 'invalid_url' | 'dns_error';
type SsrfBlockedPayload = { phase: SsrfPhase; reason: SsrfBlockedReason; durationMs: number };
type SsrfAllowedPayload = { phase: SsrfPhase; durationMs: number };

/**
 * The lifecycle stage at which an SSRF check was performed.
 * - `pre_flight`: DNS-based check run before the request is sent
 * - `connect_time`: DNS-based check run at actual socket connection
 * - `redirect`: synchronous IP check run when an HTTP redirect is followed
 */
type SsrfPhase = 'pre_flight' | 'connect_time' | 'redirect';

export type SsrfEventMap = {
	'ssrf.blocked': SsrfBlockedPayload;
	'ssrf.allowed': SsrfAllowedPayload;
};

export interface SsrfBridge {
	validateIp(ip: string): SsrfCheckResult;
	validateUrl(url: string | URL): Promise<SsrfCheckResult>;
	validateConnectionHost(host: string): SsrfCheckResult;
	validateRedirectSync(url: string): void;
	createSecureLookup(): LookupFunction;
}

type LookAndValidateResult = Result<LookupAddress[], Error>;

/**
 * Validates outbound HTTP requests against configurable blocklists and allowlists
 * to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Validation precedence (highest to lowest):
 * 1. Hostname allowlist — if hostname matches, request is allowed (an explicit
 *    allow entry wins over the hostname blocklist, so operators can carve an
 *    exception out of a broad deny)
 * 2. Hostname blocklist — if hostname matches, request is blocked (evaluated
 *    before DNS resolution)
 * 3. IP allowlist — if a resolved IP matches allowed CIDR ranges, request is allowed
 * 4. IP blocklist — if a resolved IP matches blocked CIDR ranges, request is blocked
 * 5. Otherwise — request is allowed
 *
 * The hostname blocklist is an egress-governance control, not SSRF hardening: it
 * is bypassable by IP-literal targets, alias hostnames, or DNS rebinding. The
 * robust SSRF guarantees remain IP-based and post-resolution.
 */
@Service()
export class SsrfProtectionService implements SsrfBridge {
	readonly events = new TypedEmitter<SsrfEventMap>();

	private readonly logger: Logger;

	private readonly blockedIps: BlockList;

	private readonly allowedIps: BlockList;

	private readonly allowedHostnameMatcher: HostnameMatcher;

	private readonly blockedHostnameMatcher: HostnameMatcher;

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
		this.blockedHostnameMatcher = new HostnameMatcher(this.ssrfConfig.blockedHostnames);
	}

	/**
	 * Validate a URL by resolving its hostname and checking all resolved IPs.
	 * Direct IP URLs (e.g. http://127.0.0.1) are validated without DNS resolution.
	 */
	async validateUrl(url: string | URL): Promise<SsrfCheckResult> {
		const parsed = this.tryParseUrl(url);
		if (!parsed) {
			this.events.emit('ssrf.blocked', {
				phase: 'pre_flight',
				reason: 'invalid_url',
				durationMs: 0,
			});
			return createResultError(new Error(`Invalid URL: ${String(url)}`));
		}

		const result = await this.withEvents(
			'pre_flight',
			async () => await this.lookupAndValidate(parsed.hostname, { all: true }),
		);
		return result.ok ? createResultOk(undefined) : result;
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
	 * Connect-time validation for a host a socket is about to connect to directly.
	 *
	 * IP-literal hosts (including IPv6 bracket notation) are validated.
	 * Reason: Node skips the secure `lookup` when the target is already an IP.
	 * Hostnames are resolved and validated by {@link createSecureLookup} at resolution time.
	 */
	validateConnectionHost(host: string): SsrfCheckResult {
		const ip = this.normalizeIpInHostname(host);
		if (!isIP(ip)) {
			return createResultOk(undefined);
		}
		return this.withEvents('connect_time', () => this.validateIp(ip));
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
	 * Denies redirect targets on the hostname blocklist, then validates direct-IP
	 * targets immediately. Hostname-based targets that resolve to a blocked IP are
	 * covered by the secureLookup on the redirect agent.
	 * @throws SsrfBlockedHostnameError or SsrfBlockedIpError if the target is blocked.
	 */
	validateRedirectSync(url: string): void {
		const parsed = this.tryParseUrl(url);
		if (!parsed) return;

		const { hostname } = parsed;

		if (this.allowedHostnameMatcher.matches(hostname)) return;

		if (this.blockedHostnameMatcher.matches(hostname)) {
			const error = new SsrfBlockedHostnameError(hostname);
			this.withEvents('redirect', () => createResultError(error));
			throw error;
		}

		const cleanIp = this.normalizeIpInHostname(hostname);
		if (isIP(cleanIp)) {
			const result = this.withEvents('redirect', () => this.validateIp(cleanIp));
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
		const result = await this.withEvents(
			'connect_time',
			async () => await this.lookupAndValidate(hostname, options),
		);
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

		// Hostname path. An explicit allow entry wins over the deny-list, so resolve
		// the allowed case and short-circuit the IP checks below.
		const allowedByName = this.allowedHostnameMatcher.matches(hostname);

		// Deny by name before DNS resolution (egress governance). Skipped when the
		// hostname is explicitly allowed, letting operators carve out an exception.
		if (!allowedByName && this.blockedHostnameMatcher.matches(hostname)) {
			return createResultError(new SsrfBlockedHostnameError(hostname));
		}

		const resolved = await this.dnsResolver.lookup(hostname, options);
		// The resolves must always return result(s) or throw
		assert(resolved.length > 0, `DNS lookup for ${hostname} returned no results`);

		if (allowedByName) {
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

	/** Runs `fn` and emits `ssrf.allowed` or `ssrf.blocked` based on the result. */
	private withEvents<T>(phase: SsrfPhase, fn: () => Result<T, Error>): Result<T, Error>;
	private withEvents<T>(
		phase: SsrfPhase,
		fn: () => Promise<Result<T, Error>>,
	): Promise<Result<T, Error>>;
	private withEvents<T>(
		phase: SsrfPhase,
		fn: () => Result<T, Error> | Promise<Result<T, Error>>,
	): Result<T, Error> | Promise<Result<T, Error>> {
		const start = performance.now();
		const result = fn();

		const emitAndReturn = (result: Result<T, Error>): Result<T, Error> => {
			const durationMs = performance.now() - start;
			if (result.ok) {
				this.events.emit('ssrf.allowed', { phase, durationMs });
			} else {
				this.events.emit('ssrf.blocked', {
					phase,
					reason: this.toReason(result.error),
					durationMs,
				});
			}
			return result;
		};

		const emitAndRethrow = (error: unknown): never => {
			emitAndReturn(createResultError(ensureError(error)));
			throw error;
		};

		return result instanceof Promise
			? result.then(emitAndReturn, emitAndRethrow)
			: emitAndReturn(result);
	}

	private toReason(error: Error): SsrfBlockedReason {
		if (error instanceof SsrfBlockedIpError) {
			return 'blocked_ip';
		}
		if (error instanceof SsrfBlockedHostnameError) {
			return 'blocked_hostname';
		}
		return 'dns_error';
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
