import { Logger, TypedEmitter } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import type { EgressProtectionMode } from '@n8n/config';
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

type SsrfBlockedPayload = {
	phase: SsrfPhase;
	reason: string;
	durationMs: number;
	/** The hostname the request asked for (what an admin allowlists). */
	hostname?: string;
	/** The resolved/target IP that triggered the block (often the block reason). */
	ip?: string;
	/**
	 * `true` when the policy *would* have blocked but did not, because the engine
	 * is in `log` mode (observe-before-enforce). `false` for a real `enforce` block.
	 */
	wouldBlock: boolean;
};
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

/**
 * The mutable, runtime-swappable inputs that make up an egress policy. This is
 * the *effective* policy (environment baseline composed with any database
 * overrides); the engine never sees the two layers separately.
 */
export interface EgressPolicyInput {
	mode: EgressProtectionMode;
	blockedIpRanges: readonly string[];
	allowedIpRanges: readonly string[];
	allowedHostnames: readonly string[];
	blockedHostnames: readonly string[];
}

/** A policy compiled into the in-memory structures read on the request path. */
interface CompiledPolicy {
	mode: EgressProtectionMode;
	blockedIps: BlockList;
	allowedIps: BlockList;
	allowedHostnameMatcher: HostnameMatcher;
	blockedHostnameMatcher: HostnameMatcher;
}

interface DestinationContext {
	hostname?: string;
	ip?: string;
}

/** The outcome of resolving + checking a destination, before the mode is applied. */
interface LookupOutcome {
	addresses: LookupAddress[];
	/** The first resolved IP that violates the policy, if any. */
	blockedIp?: string;
}

/**
 * Validates outbound HTTP requests against a configurable egress policy to
 * prevent Server-Side Request Forgery (SSRF).
 *
 * The policy carries one of three modes:
 * - `off`: validation is skipped entirely; the bridge is a passthrough and emits
 *   no events.
 * - `log`: validation runs and `ssrf.blocked` events are emitted tagged
 *   `wouldBlock: true`, but nothing is blocked (observe-before-enforce).
 * - `enforce`: validation runs, events are emitted, and blocked destinations are
 *   rejected.
 *
 * The compiled policy is held in a single field and swapped atomically by
 * {@link updatePolicy}, so an admin can change the policy at runtime without a
 * restart and without the request path ever touching the DB.
 *
 * Validation precedence (highest to lowest):
 * 1. Hostname allowlist — if hostname matches, request is allowed (an explicit
 *    allow wins over the hostname blocklist, so an operator can carve an
 *    exception out of a broad deny)
 * 2. Hostname blocklist — if hostname matches, request is blocked (evaluated
 *    before DNS resolution, so a denied name is rejected cheaply even when it
 *    would resolve to an allowed public IP)
 * 3. IP allowlist — if IP matches allowed CIDR ranges, request is allowed
 * 4. IP blocklist — if IP matches blocked CIDR ranges, request is blocked
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

	/** The compiled, in-memory policy. Read on the hot path; swapped atomically. */
	private policy: CompiledPolicy;

	constructor(
		ssrfConfig: SsrfProtectionConfig,
		private readonly dnsResolver: DnsResolver,
		logger: Logger,
	) {
		this.logger = logger.scoped('ssrf-protection');
		this.policy = this.compile({
			mode: ssrfConfig.mode,
			blockedIpRanges: ssrfConfig.blockedIpRanges,
			allowedIpRanges: ssrfConfig.allowedIpRanges,
			allowedHostnames: ssrfConfig.allowedHostnames,
			blockedHostnames: ssrfConfig.blockedHostnames,
		});
	}

	/** The effective egress protection mode currently in force. */
	get mode(): EgressProtectionMode {
		return this.policy.mode;
	}

	/**
	 * Whether the validation path runs at all (mode is `log` or `enforce`).
	 * High-risk call sites read this to decide whether to attach the bridge for
	 * user-controlled URLs. Reflects runtime overrides, not just the env baseline.
	 */
	isActive(): boolean {
		return this.policy.mode !== 'off';
	}

	/**
	 * Atomically replace the effective policy. Safe to call repeatedly; the
	 * request path keeps reading the previous compiled policy until the single
	 * reference assignment below completes.
	 */
	updatePolicy(input: EgressPolicyInput): void {
		this.policy = this.compile(input);
		this.logger.debug('Egress protection policy updated', { mode: input.mode });
	}

	private compile(input: EgressPolicyInput): CompiledPolicy {
		const blocked = buildIpRangeList(input.blockedIpRanges);
		for (const issue of blocked.issues) {
			this.logger.warn(
				`Invalid value '${issue.entry}' in egress blocked IP ranges: ${issue.error}`,
			);
		}

		const allowed = buildIpRangeList(input.allowedIpRanges);
		for (const issue of allowed.issues) {
			this.logger.warn(
				`Invalid value '${issue.entry}' in egress allowed IP ranges: ${issue.error}`,
			);
		}

		return {
			mode: input.mode,
			blockedIps: blocked.list,
			allowedIps: allowed.list,
			allowedHostnameMatcher: new HostnameMatcher(input.allowedHostnames),
			blockedHostnameMatcher: new HostnameMatcher(input.blockedHostnames),
		};
	}

	/**
	 * Validate a URL by resolving its hostname and checking all resolved IPs.
	 * Direct IP URLs (e.g. http://127.0.0.1) are validated without DNS resolution.
	 *
	 * In `log` mode this always resolves to ok (the request proceeds) but still
	 * emits a `wouldBlock` event for blocked destinations.
	 */
	async validateUrl(url: string | URL): Promise<SsrfCheckResult> {
		const policy = this.policy;
		if (policy.mode === 'off') return createResultOk(undefined);

		const parsed = this.tryParseUrl(url);
		if (!parsed) {
			this.emitBlocked('pre_flight', 'invalid_url', 0, {}, policy);
			return policy.mode === 'enforce'
				? createResultError(new Error(`Invalid URL: ${String(url)}`))
				: createResultOk(undefined);
		}

		const start = performance.now();
		const dest: DestinationContext = { hostname: parsed.hostname };

		// Deny by name before DNS resolution (egress governance). An explicit allow
		// entry wins, letting an operator carve an exception out of a broad deny.
		if (this.hostnameBlocked(parsed.hostname, policy)) {
			return this.applyHostnameBlock('pre_flight', parsed.hostname, start, policy);
		}

		let outcome: LookupOutcome;
		try {
			outcome = await this.resolveAndCheck(parsed.hostname, { all: true }, policy);
		} catch (error) {
			// DNS / infrastructure failures are not policy decisions: the request
			// cannot proceed regardless of mode, so the error propagates (matching
			// the behavior of a direct request). Only policy blocks are swallowed
			// in log mode.
			this.emitBlocked('pre_flight', 'dns_error', performance.now() - start, dest, policy);
			throw ensureError(error);
		}

		return this.applyMode(
			'pre_flight',
			{ ...dest, ip: outcome.blockedIp },
			outcome.blockedIp,
			start,
			policy,
		);
	}

	/**
	 * Validate a single IP address against the allowlist and blocklist.
	 *
	 * In `log` mode this returns ok but emits a `wouldBlock` event.
	 */
	validateIp(ip: string): SsrfCheckResult {
		const policy = this.policy;
		if (policy.mode === 'off') return createResultOk(undefined);

		const start = performance.now();
		const blocked = !this.checkIp(ip, policy).ok;
		return this.applyMode('connect_time', { ip }, blocked ? ip : undefined, start, policy);
	}

	/**
	 * Connect-time validation for a host a socket is about to connect to directly.
	 *
	 * IP-literal hosts (including IPv6 bracket notation) are validated.
	 * Reason: Node skips the secure `lookup` when the target is already an IP.
	 * Hostnames are resolved and validated by {@link createSecureLookup} at resolution time.
	 */
	validateConnectionHost(host: string): SsrfCheckResult {
		const policy = this.policy;
		if (policy.mode === 'off') return createResultOk(undefined);

		const ip = this.normalizeIpInHostname(host);
		if (!isIP(ip)) {
			return createResultOk(undefined);
		}

		const start = performance.now();
		const blocked = !this.checkIp(ip, policy).ok;
		return this.applyMode(
			'connect_time',
			{ hostname: host, ip },
			blocked ? ip : undefined,
			start,
			policy,
		);
	}

	/**
	 * Create a custom DNS lookup function that is a drop-in replacement for
	 * Node.js `dns.lookup`. It can be passed to `socket.connect({ lookup })`
	 * or `axios.request({ lookup })` to validate resolved IPs at connection
	 * time, preventing TOCTOU attacks.
	 *
	 * In `log` mode the resolved addresses are returned even when a resolved IP
	 * is blocked, so the connection proceeds; a `wouldBlock` event is still
	 * emitted. In `enforce` mode a blocked IP fails the lookup.
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
	 *
	 * Throws SsrfBlockedIpError if the redirect target is blocked in `enforce`
	 * mode; in `log` mode it only emits a `wouldBlock` event and returns.
	 */
	validateRedirectSync(url: string): void {
		const policy = this.policy;
		if (policy.mode === 'off') return;

		const parsed = this.tryParseUrl(url);
		if (!parsed) return;

		const { hostname } = parsed;

		if (policy.allowedHostnameMatcher.matches(hostname)) return;

		// Deny redirect targets on the hostname blocklist before any IP check.
		// Hostname targets that resolve to a blocked IP are still caught by the
		// secureLookup on the redirect agent.
		if (policy.blockedHostnameMatcher.matches(hostname)) {
			const result = this.applyHostnameBlock('redirect', hostname, performance.now(), policy);
			if (!result.ok) {
				throw result.error;
			}
			return;
		}

		const cleanIp = this.normalizeIpInHostname(hostname);
		if (!isIP(cleanIp)) return;

		const start = performance.now();
		const blocked = !this.checkIp(cleanIp, policy).ok;
		const result = this.applyMode(
			'redirect',
			{ hostname, ip: cleanIp },
			blocked ? cleanIp : undefined,
			start,
			policy,
		);
		if (!result.ok) {
			throw result.error;
		}
	}

	/**
	 * Emit the appropriate event for a check and apply the current mode:
	 * - allowed (no `blockedIp`): emit `ssrf.allowed`, return ok.
	 * - blocked in `enforce`: emit `ssrf.blocked`, return the error.
	 * - blocked in `log`: emit `ssrf.blocked` tagged `wouldBlock`, return ok.
	 */
	private applyMode(
		phase: SsrfPhase,
		dest: DestinationContext,
		blockedIp: string | undefined,
		start: number,
		policy: CompiledPolicy,
	): SsrfCheckResult {
		const durationMs = performance.now() - start;
		if (blockedIp === undefined) {
			this.events.emit('ssrf.allowed', { phase, durationMs });
			return createResultOk(undefined);
		}

		this.emitBlocked(phase, 'blocked_ip', durationMs, dest, policy);

		return policy.mode === 'enforce'
			? createResultError(new SsrfBlockedIpError(blockedIp, dest.hostname))
			: createResultOk(undefined);
	}

	/**
	 * Whether a hostname is denied by the blocklist. An explicit allow entry wins,
	 * so an operator can carve an exception out of a broad deny (e.g. allow
	 * `api.example.com` while blocking `*.example.com`).
	 */
	private hostnameBlocked(hostname: string, policy: CompiledPolicy): boolean {
		if (policy.allowedHostnameMatcher.matches(hostname)) return false;
		return policy.blockedHostnameMatcher.matches(hostname);
	}

	/**
	 * Apply the mode to a hostname-blocklist decision: emit the block event, then
	 * reject (`enforce`) or allow with a `wouldBlock` event (`log`).
	 */
	private applyHostnameBlock(
		phase: SsrfPhase,
		hostname: string,
		start: number,
		policy: CompiledPolicy,
	): SsrfCheckResult {
		this.emitBlocked(phase, 'blocked_hostname', performance.now() - start, { hostname }, policy);
		return policy.mode === 'enforce'
			? createResultError(new SsrfBlockedHostnameError(hostname))
			: createResultOk(undefined);
	}

	private emitBlocked(
		phase: SsrfPhase,
		reason: string,
		durationMs: number,
		dest: DestinationContext,
		policy: CompiledPolicy,
	): void {
		this.events.emit('ssrf.blocked', {
			phase,
			reason,
			durationMs,
			hostname: dest.hostname,
			ip: dest.ip,
			wouldBlock: policy.mode === 'log',
		});
	}

	/**
	 * @throws on DNS resolution failure (infrastructure error)
	 * @throws {SsrfBlockedIpError} if a resolved IP is blocked and mode is `enforce`
	 */
	private async secureLookupAsync(
		hostname: string,
		options: LookupOptions,
	): Promise<LookupAddress[]> {
		const policy = this.policy;
		if (policy.mode === 'off') {
			return await this.resolveAddresses(hostname, options);
		}

		const start = performance.now();

		// Deny by name before DNS resolution (egress governance). An explicit allow
		// entry wins, letting an operator carve an exception out of a broad deny.
		if (this.hostnameBlocked(hostname, policy)) {
			this.emitBlocked(
				'connect_time',
				'blocked_hostname',
				performance.now() - start,
				{ hostname },
				policy,
			);
			if (policy.mode === 'enforce') {
				throw new SsrfBlockedHostnameError(hostname);
			}
			// log mode: resolve and proceed so nothing breaks.
			return await this.resolveAddresses(hostname, options);
		}

		const outcome = await this.resolveAndCheck(hostname, options, policy);

		if (outcome.blockedIp === undefined) {
			this.events.emit('ssrf.allowed', {
				phase: 'connect_time',
				durationMs: performance.now() - start,
			});
			return outcome.addresses;
		}

		this.emitBlocked(
			'connect_time',
			'blocked_ip',
			performance.now() - start,
			{ hostname, ip: outcome.blockedIp },
			policy,
		);

		if (policy.mode === 'enforce') {
			throw new SsrfBlockedIpError(outcome.blockedIp, hostname);
		}

		// log mode: proceed with the resolved addresses so nothing breaks.
		return outcome.addresses;
	}

	/**
	 * Resolve a hostname (or pass through a direct IP) and find the first
	 * resolved IP that violates the policy, without applying the mode. DNS
	 * failures throw; policy violations are returned as `blockedIp`.
	 */
	private async resolveAndCheck(
		hostname: string,
		options: LookupOptions,
		policy: CompiledPolicy,
	): Promise<LookupOutcome> {
		const addresses = await this.resolveAddresses(hostname, options);

		const cleanIp = this.normalizeIpInHostname(hostname);
		if (!isIP(cleanIp) && policy.allowedHostnameMatcher.matches(hostname)) {
			return { addresses };
		}

		for (const address of addresses) {
			if (!this.checkIp(address.address, policy).ok) {
				return { addresses, blockedIp: address.address };
			}
		}

		return { addresses };
	}

	/** Resolve a hostname to addresses, or echo a direct IP literal. Throws on DNS failure. */
	private async resolveAddresses(
		hostname: string,
		options: LookupOptions,
	): Promise<LookupAddress[]> {
		const cleanIp = this.normalizeIpInHostname(hostname);
		const ipFamily = isIP(cleanIp);
		if (ipFamily) {
			return [{ address: cleanIp, family: ipFamily }];
		}

		const resolved = await this.dnsResolver.lookup(hostname, options);
		// The resolver must always return result(s) or throw
		assert(resolved.length > 0, `DNS lookup for ${hostname} returned no results`);
		return resolved;
	}

	/** Pure policy decision for a single IP: allowlist wins, then blocklist, else allow. */
	private checkIp(ip: string, policy: CompiledPolicy): SsrfCheckResult {
		const family = this.getIpFamily(ip);
		assert(family !== null, `Invalid IP address: ${ip}`);

		if (policy.allowedIps.check(ip, family)) {
			return createResultOk(undefined);
		}

		if (policy.blockedIps.check(ip, family)) {
			return createResultError(new SsrfBlockedIpError(ip));
		}

		return createResultOk(undefined);
	}

	/**
	 * Normalize IPv6 bracket notation from a URL hostname.
	 * E.g. `[::1]` -> `::1`, `127.0.0.1` -> `127.0.0.1`.
	 */
	private normalizeIpInHostname(hostname: string): string {
		return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
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
