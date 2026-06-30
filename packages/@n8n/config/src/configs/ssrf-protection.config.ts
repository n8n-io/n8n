import { z } from 'zod';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Default blocked IP ranges applied when N8N_EGRESS_BLOCKED_IP_RANGES is 'default'.
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
 * Egress protection mode.
 * - `off`: protection is disabled; outbound calls are not validated and no events are emitted.
 * - `log`: outbound calls are validated and would-block events are emitted, but nothing is blocked
 *   (observe-before-enforce). This is the default so a fresh or upgraded instance starts observing.
 * - `enforce`: outbound calls are validated, events are emitted, and blocked destinations are rejected.
 */
export type EgressProtectionMode = 'off' | 'log' | 'enforce';

export const EGRESS_PROTECTION_MODES: readonly EgressProtectionMode[] = Object.freeze([
	'off',
	'log',
	'enforce',
]);

export const EGRESS_PROTECTION_MODE_DEFAULT: EgressProtectionMode = 'log';

const isEgressMode = (value: string): value is EgressProtectionMode =>
	(EGRESS_PROTECTION_MODES as readonly string[]).includes(value);

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

const modeSchema = z.string().transform((value) => {
	const normalized = value.trim().toLowerCase();
	if (isEgressMode(normalized)) return normalized;
	console.warn(
		`Invalid value for N8N_EGRESS_PROTECTION_MODE="${value}". Expected one of ${EGRESS_PROTECTION_MODES.join(
			', ',
		)}. Falling back to "${EGRESS_PROTECTION_MODE_DEFAULT}".`,
	);
	return EGRESS_PROTECTION_MODE_DEFAULT;
});

/**
 * The `N8N_SSRF_*` env vars are the previous names for the egress protection
 * knobs. They are kept as deprecated aliases for one migration window so an
 * upgrade does not silently change behavior. The new `N8N_EGRESS_*` vars take
 * precedence; reading a legacy var logs a one-time warning.
 */
const warnLegacyEnv = (legacyName: string, newName: string): void => {
	console.warn(
		`${legacyName} is deprecated and will be removed in a future release. Use ${newName} instead.`,
	);
};

/**
 * Resolves the baseline mode default from the legacy `N8N_SSRF_PROTECTION_ENABLED`
 * flag when the new `N8N_EGRESS_PROTECTION_MODE` is not set:
 * - `true`  → `enforce` (preserve the operator's previous "blocking" posture)
 * - `false` → `off`
 * - unset   → `log` (the new default)
 *
 * This avoids a silent downgrade on upgrade for operators who had explicitly
 * enabled the old binary protection.
 */
const readLegacyMode = (): EgressProtectionMode => {
	const legacy = process.env.N8N_SSRF_PROTECTION_ENABLED;
	if (legacy === undefined) return EGRESS_PROTECTION_MODE_DEFAULT;
	warnLegacyEnv('N8N_SSRF_PROTECTION_ENABLED', 'N8N_EGRESS_PROTECTION_MODE');
	return ['true', '1'].includes(legacy.trim().toLowerCase()) ? 'enforce' : 'off';
};

const readLegacyBlockedIpRanges = (): string[] => {
	const legacy = process.env.N8N_SSRF_BLOCKED_IP_RANGES;
	if (legacy === undefined) return [...SSRF_DEFAULT_BLOCKED_IP_RANGES];
	warnLegacyEnv('N8N_SSRF_BLOCKED_IP_RANGES', 'N8N_EGRESS_BLOCKED_IP_RANGES');
	return parseBlockedIpRanges(legacy);
};

const readLegacyCsv = (legacyName: string, newName: string): CommaSeparatedStringArray<string> => {
	const legacy = process.env[legacyName];
	if (legacy === undefined) return new CommaSeparatedStringArray('');
	warnLegacyEnv(legacyName, newName);
	return new CommaSeparatedStringArray(legacy);
};

const readLegacyDnsCacheMaxSize = (): number => {
	const legacy = process.env.N8N_SSRF_DNS_CACHE_MAX_SIZE;
	const fallback = 1024 * 1024;
	if (legacy === undefined) return fallback;
	warnLegacyEnv('N8N_SSRF_DNS_CACHE_MAX_SIZE', 'N8N_EGRESS_DNS_CACHE_MAX_SIZE');
	const parsed = Number(legacy);
	return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Configuration for egress (SSRF) protection.
 *
 * These env vars *seed* the egress policy: on first boot (or on every boot when
 * `N8N_EGRESS_PROTECTION_MANAGED_BY_ENV` is set) they are written into the
 * settings table, which is the runtime source of truth. They set:
 * - the {@link mode} (Off / Log / Enforce),
 * - which IPs and hostnames are blocked or allowed,
 * - and how large the DNS cache may grow.
 *
 * It does **not** decide, on its own, which outbound requests are guarded.
 * That choice is made per call site via the `ssrf` option on
 * `OutboundHttp.requests()` / `.transport()`, because whether a destination is
 * dangerous depends on where its URL comes from. High-risk call sites consult
 * the engine's effective mode (see `SsrfProtectionService.isActive()`).
 *
 * Validation precedence inside the service: allowed hostname → blocked hostname
 * → allowed IP range → blocked IP range → allow. Allow-list matches short-circuit
 * the remaining checks, so an explicit allowed hostname wins over a
 * blocked-hostname match and lets an operator carve an exception out of a broad
 * deny.
 *
 * Checks run at multiple phases (pre-flight DNS, connect time, and every
 * redirect hop) to defeat DNS-rebinding (TOCTOU).
 *
 * SSRF is the engine; "egress protection" is the product surface exposed to
 * admins. The class keeps the engine name for continuity.
 */
@Config
export class SsrfProtectionConfig {
	/**
	 * The baseline egress protection mode: `off`, `log`, or `enforce`.
	 *
	 * Defaults to `log` (observe-before-enforce): a fresh or upgraded instance
	 * validates outbound high-risk calls and records what *would* be blocked,
	 * without blocking anything. Switch to `enforce` to actually block, or `off`
	 * to disable the validation path entirely.
	 *
	 * Replaces the previous binary `N8N_SSRF_PROTECTION_ENABLED` flag, which is
	 * still honored as a deprecated alias (`true` → `enforce`, `false` → `off`).
	 *
	 * This is the *seed value*; once seeded, the mode lives in the settings table
	 * and an admin can change it at runtime via the egress protection UI (unless
	 * editing is disabled or the policy is managed by env).
	 */
	@Env('N8N_EGRESS_PROTECTION_MODE', modeSchema)
	mode: EgressProtectionMode = readLegacyMode();

	/**
	 * Whether the egress protection policy can be edited at runtime through the
	 * admin UI. When `false` (e.g. on Cloud, where the platform owns the policy),
	 * the admin page is shown read-only and writes are rejected. Independent of
	 * `N8N_EGRESS_PROTECTION_MANAGED_BY_ENV`, which also locks the UI but, in
	 * addition, re-seeds the policy from env on every startup. Defaults to `true`.
	 */
	@Env('N8N_EGRESS_PROTECTION_EDITABLE')
	editable: boolean = true;

	/**
	 * The IP address ranges (in CIDR notation) that guarded requests are not
	 * allowed to reach. Comma-separated.
	 *
	 * The keyword `default` expands to n8n's built-in list of private, loopback,
	 * link-local (including cloud metadata endpoints) and reserved ranges. Keep
	 * it and append your own to block more, for example: `default,100.64.0.0/10`.
	 */
	@Env('N8N_EGRESS_BLOCKED_IP_RANGES', blockedIpRangesSchema)
	blockedIpRanges: string[] = readLegacyBlockedIpRanges();

	/**
	 * The IP address ranges (in CIDR notation) that guarded requests are allowed
	 * to reach even if they fall inside a blocked range. Comma-separated, empty
	 * by default.
	 *
	 * Use this to reach a known internal service while protection is on, for
	 * example `10.20.0.5/32` for an on-prem API. An allowed range always wins
	 * over the blocked list.
	 */
	@Env('N8N_EGRESS_ALLOWED_IP_RANGES')
	allowedIpRanges: CommaSeparatedStringArray<string> = readLegacyCsv(
		'N8N_SSRF_ALLOWED_IP_RANGES',
		'N8N_EGRESS_ALLOWED_IP_RANGES',
	);

	/**
	 * The hostnames that guarded requests are allowed to reach without any IP
	 * checks. Comma-separated, empty by default.
	 *
	 * A leading wildcard matches subdomains: `*.internal.example.com` allows any
	 * subdomain but not the bare `internal.example.com`. Use this when you prefer
	 * to allow an internal service by name rather than by IP range.
	 */
	@Env('N8N_EGRESS_ALLOWED_HOSTNAMES')
	allowedHostnames: CommaSeparatedStringArray<string> = readLegacyCsv(
		'N8N_SSRF_ALLOWED_HOSTNAMES',
		'N8N_EGRESS_ALLOWED_HOSTNAMES',
	);

	/**
	 * The hostnames that guarded requests are denied from reaching, by name,
	 * before DNS resolution runs. Comma-separated, empty by default.
	 *
	 * A leading wildcard matches subdomains: `*.tracker.example` blocks any
	 * subdomain but not the bare `tracker.example`. Use this for egress governance
	 * — denying a destination by name even when it resolves to a public IP you
	 * otherwise allow. An entry in {@link allowedHostnames} always wins, so you can
	 * carve an exception out of a broad deny.
	 *
	 * This is a governance control, not SSRF hardening: it is bypassable by an
	 * attacker who controls the URL (IP-literal targets, alias hostnames, or DNS
	 * rebinding). The robust SSRF guarantees stay IP-based and post-resolution; to
	 * block a destination reliably, use {@link blockedIpRanges}.
	 *
	 * This is a *seed value*; an admin can add or remove entries at runtime via
	 * the egress protection settings (stored in the database) when editing is allowed.
	 */
	@Env('N8N_EGRESS_BLOCKED_HOSTNAMES')
	blockedHostnames: CommaSeparatedStringArray<string> = readLegacyCsv(
		'N8N_SSRF_BLOCKED_HOSTNAMES',
		'N8N_EGRESS_BLOCKED_HOSTNAMES',
	);

	/**
	 * The maximum size, in bytes, of the internal cache that remembers recent
	 * DNS lookups. Defaults to 1 MB; the oldest entries are dropped once the
	 * limit is reached. Most instances never need to change this — raise it only
	 * if you resolve a very large number of distinct hostnames.
	 */
	@Env('N8N_EGRESS_DNS_CACHE_MAX_SIZE')
	dnsCacheMaxSize: number = readLegacyDnsCacheMaxSize();

	/**
	 * Whether the protection validation path runs at all for the env *seed*
	 * policy. True for `log` and `enforce`, false for `off`. Derived from
	 * {@link mode} in {@link sanitize} after env resolution.
	 *
	 * @deprecated Prefer reading the effective mode from the engine
	 * (`SsrfProtectionService.isActive()`), which reflects the runtime policy.
	 * This field only reflects the environment seed value.
	 */
	enabled: boolean = true;

	/** Derive {@link enabled} from {@link mode} once env values are applied. */
	sanitize(): void {
		this.enabled = this.mode !== 'off';
	}
}
