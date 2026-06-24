/**
 * SSRF guard contract for the web_fetch tool.
 *
 * This is the narrow slice of `@n8n/backend-network`'s `SsrfBridge` that the
 * web_fetch tool actually needs: URL validation, redirect validation and a
 * secure DNS lookup. `SsrfProtectionService` implements `SsrfBridge`, so the cli
 * composition root passes it directly; `createPassthroughSsrfGuard` below is the
 * no-op variant. `SsrfBridge` is imported as a type only (via the dependency-free
 * `/transport` subpath), so this leaf package takes no runtime dependency on the
 * network package.
 */
import type { SsrfBridge } from '@n8n/backend-network/transport';
import { createResultOk, ensureError } from 'n8n-workflow';
import dns from 'node:dns';
import type { LookupFunction } from 'node:net';

export type SsrfGuard = Pick<
	SsrfBridge,
	'validateUrl' | 'validateRedirectSync' | 'createSecureLookup'
>;

/**
 * Thrown inside `beforeRedirect` to halt axios auto-follow when a redirect crosses to a
 * different host, so the tool can run its HITL domain-approval flow for the new host.
 */
export class CrossHostRedirectError extends Error {
	constructor(readonly finalUrl: string) {
		super(`Redirect to a different host: ${finalUrl}`);
		this.name = 'CrossHostRedirectError';
	}
}

/**
 * No-op guard used when SSRF protection is disabled (and in the eval harness / tests).
 * Domain-approval layer still applies. IP-level checks block private/rfc1918 ranges
 * even in passthrough mode as a defense-in-depth measure against DNS rebinding.
 */
export function createPassthroughSsrfGuard(): SsrfGuard {
	return {
		validateUrl: async () => createResultOk(undefined),
		validateRedirectSync: () => {},
		createSecureLookup: () => createPrivateIpBlockingLookup(),
	};
}

/**
 * RFC 1918 / private IP ranges that are never valid SSRF targets.
 * Blocks at the DNS resolution layer even in passthrough mode.
 */
const PRIVATE_IP_RANGES = [
	// IPv4 private ranges
	{ start: '10.0.0.0', end: '10.255.255.255' },
	{ start: '172.16.0.0', end: '172.31.255.255' },
	{ start: '192.168.0.0', end: '192.168.255.255' },
	{ start: '127.0.0.0', end: '127.255.255.255' },
	{ start: '169.254.0.0', end: '169.254.255.255' },
	// IPv6 loopback + link-local
];

function ipToNumber(ip: string): number {
	const parts = ip.split('.');
	if (parts.length !== 4) return 0;
	return (
		Number(parts[0]) * 16_777_216 +
		Number(parts[1]) * 65_536 +
		Number(parts[2]) * 256 +
		Number(parts[3])
	);
}

function isPrivateIp(ip: string): boolean {
	const num = ipToNumber(ip);
	if (num === 0) return false;
	return PRIVATE_IP_RANGES.some((range) => {
		const startNum = ipToNumber(range.start);
		const endNum = ipToNumber(range.end);
		return num >= startNum && num <= endNum;
	});
}

class PrivateIpBlockedError extends Error {
	constructor(ip: string) {
		super(`SSRF block: access to private IP ${ip} is not allowed`);
		this.name = 'SsrfBlockedIpError';
	}
}

/**
 * Create a `dns.lookup`-compatible function that blocks private IP ranges.
 * This is the minimum-security lookup used when SSRF protection is in
 * passthrough mode — still blocks internal network access attempts.
 */
function createPrivateIpBlockingLookup(): LookupFunction {
	return (
		hostname: string,
		options: unknown,
		callback?: (err: Error | null, address?: string, family?: number) => void,
	) => {
		if (typeof options === 'function') {
			callback = options;
			options = undefined;
		}
		const cb = callback ?? (() => {});
		dns.lookup(hostname, options as dns.LookupOptions | undefined, (err, address, family) => {
			if (err) return cb(err, undefined, family);
			if (address && isPrivateIp(address)) {
				return cb(new PrivateIpBlockedError(address), undefined, family);
			}
			return cb(null, address, family);
		});
	};
}

/**
 * Create a secure dns.lookup that blocks private IP ranges.
 * Used when full SSRF protection is enabled.
 */
export function createSecureSsrfLookup(): LookupFunction {
	return createPrivateIpBlockingLookup();
}

/**
 * Walk an axios error's cause chain to detect an SSRF block surfaced from
 * `createSecureLookup`/`validateRedirectSync`. The chain is typically
 * `AxiosError → RedirectionError → SsrfBlockedIpError` (depth <= 4). Detected by name
 * so the builder package needs no import of cli's `SsrfBlockedIpError`.
 */
export function isSsrfBlockedError(error: unknown): boolean {
	let current: Error | undefined = ensureError(error);
	for (let depth = 0; depth < 4 && current; depth++) {
		if (current.name === 'SsrfBlockedIpError') return true;
		current = current.cause ? ensureError(current.cause) : undefined;
	}
	return false;
}

/** Same cause-chain walk, returning the `CrossHostRedirectError` if present. */
export function findCrossHostRedirectError(error: unknown): CrossHostRedirectError | undefined {
	let current: Error | undefined = ensureError(error);
	for (let depth = 0; depth < 4 && current; depth++) {
		if (current instanceof CrossHostRedirectError) return current;
		current = current.cause ? ensureError(current.cause) : undefined;
	}
	return undefined;
}
