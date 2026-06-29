import { z } from 'zod';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Default blocked IP ranges applied when N8N_SSRF_BLOCKED_IP_RANGES is 'default'.
 * Covers RFC 1918, loopback, link-local, IPv6 unique local, and reserved/special ranges.
 */
export const SSRF_DEFAULT_BLOCKED_IP_RANGES: readonly string[] = Object.freeze([
	// RFC 1918 private ranges
	'10.0.0.0/8',
	'172.16.0.0/12',
	'192.168.0.0/16',
	// Loopback
	'127.0.0.0/8',
	'::1/128',
	// Link-local
	'169.254.0.0/16',
	'fe80::/10',
	// IPv6 unique local
	'fc00::/7',
	'fd00::/8',
	// Reserved/special purpose
	'0.0.0.0/8',
	'192.0.0.0/24',
	'192.0.2.0/24',
	'198.18.0.0/15',
	'198.51.100.0/24',
	'203.0.113.0/24',
]);

/**
 * Parses comma-separated blocked ranges, expands `default` (case-insensitive)
 * to the built-in blocked ranges, and removes duplicates while preserving order.
 */
const parseBlockedIpRanges = (input: string): string[] => {
	const values = input
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	const expanded = values.flatMap((value) =>
		value.toLowerCase() === 'default' ? SSRF_DEFAULT_BLOCKED_IP_RANGES : value,
	);

	return [...new Set(expanded)];
};

const blockedIpRangesSchema = z.string().transform(parseBlockedIpRanges);

/**
 * Configuration for SSRF (Server-Side Request Forgery) protection.
 *
 * This config sets the *policy* (how the guard behaves once it runs):
 * - which IPs and hostnames are blocked or allowed,
 * - and how large the DNS cache may grow.
 *
 * It does **not** decide, on its own, which outbound requests are guarded.
 *
 * That choice is made per call site via the `ssrf` option on `OutboundHttp.requests()` / `.transport()`,
 * because whether a destination is dangerous depends on where its URL comes from.
 * The one exception is {@link enabled}, which high-risk call sites read to decide
 * whether to switch protection on for user-controlled URLs.
 *
 * Validation precedence inside the service: allowed hostname → blocked hostname
 * → allowed IP range → blocked IP range → allow.
 * Allow-list matches short-circuit the remaining checks, so an explicit allowed
 * hostname wins over a blocked-hostname match and lets an operator carve an
 * exception out of a broad deny.
 *
 * Checks run at multiple phases (pre-flight DNS, connect time, and every
 * redirect hop) to defeat DNS-rebinding (TOCTOU).
 */
@Config
export class SsrfProtectionConfig {
	/**
	 * Turn SSRF protection on for outbound requests whose destination can be
	 * influenced by user input, for example a URL pasted into the HTTP Request
	 * node, a workflow imported from a URL, or an OAuth/discovery endpoint.
	 *
	 * Off by default so existing self-hosted setups that call internal services
	 * keep working. Turn it on to stop n8n from reaching private or internal
	 * addresses on behalf of untrusted input, then use the allow-lists below to
	 * re-open the specific internal hosts you still need.
	 *
	 * Requests to fixed, n8n-owned or operator-configured destinations (the
	 * license server, your configured identity provider, your secrets manager)
	 * are unaffected by this setting.
	 */
	@Env('N8N_SSRF_PROTECTION_ENABLED')
	enabled: boolean = false;

	/**
	 * The IP address ranges (in CIDR notation) that guarded requests are not
	 * allowed to reach. Comma-separated.
	 *
	 * The keyword `default` expands to n8n's built-in list of private, loopback,
	 * link-local (including cloud metadata endpoints) and reserved ranges. Keep
	 * it and append your own to block more, for example: `default,100.64.0.0/10`.
	 */
	@Env('N8N_SSRF_BLOCKED_IP_RANGES', blockedIpRangesSchema)
	blockedIpRanges: string[] = [...SSRF_DEFAULT_BLOCKED_IP_RANGES];

	/**
	 * The IP address ranges (in CIDR notation) that guarded requests are allowed
	 * to reach even if they fall inside a blocked range. Comma-separated, empty
	 * by default.
	 *
	 * Use this to reach a known internal service while protection is on, for
	 * example `10.20.0.5/32` for an on-prem API. An allowed range always wins
	 * over the blocked list.
	 */
	@Env('N8N_SSRF_ALLOWED_IP_RANGES')
	allowedIpRanges: CommaSeparatedStringArray<string> = [];

	/**
	 * The hostnames that guarded requests are allowed to reach without any IP
	 * checks. Comma-separated, empty by default.
	 *
	 * A leading wildcard matches subdomains: `*.internal.example.com` allows any
	 * subdomain but not the bare `internal.example.com`. Use this when you prefer
	 * to allow an internal service by name rather than by IP range.
	 */
	@Env('N8N_SSRF_ALLOWED_HOSTNAMES')
	allowedHostnames: CommaSeparatedStringArray<string> = [];

	/**
	 * The hostnames that guarded requests are denied from reaching, by name,
	 * before DNS resolution runs. Comma-separated, empty by default. A leading
	 * wildcard matches subdomains: `*.example.com` blocks any subdomain but not
	 * the bare `example.com`.
	 *
	 * Use this for egress governance — denying a destination by name even when it
	 * resolves to a public IP you otherwise allow. An entry in
	 * {@link allowedHostnames} always wins, so you can carve an exception out of a
	 * broad deny. Internationalized hostnames must be supplied in their ASCII
	 * (punycode, `xn--`) form, since that is how they are compared at runtime.
	 *
	 * This is a governance control, not SSRF hardening: it is bypassable by an
	 * attacker who controls the URL (IP-literal targets, alias hostnames that
	 * resolve to the same IP, or DNS rebinding). The robust SSRF guarantees stay
	 * IP-based and post-resolution. To block a destination reliably, use
	 * {@link blockedIpRanges}.
	 */
	@Env('N8N_SSRF_BLOCKED_HOSTNAMES')
	blockedHostnames: CommaSeparatedStringArray<string> = [];

	/**
	 * The maximum size, in bytes, of the internal cache that remembers recent
	 * DNS lookups. Defaults to 1 MB; the oldest entries are dropped once the
	 * limit is reached. Most instances never need to change this — raise it only
	 * if you resolve a very large number of distinct hostnames.
	 */
	@Env('N8N_SSRF_DNS_CACHE_MAX_SIZE')
	dnsCacheMaxSize: number = 1024 * 1024;
}
