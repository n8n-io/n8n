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
	'::1',
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
 *
 * @example
 * parseBlockedIpRanges('default,100.0.0.0/8')
 * // returns [...SSRF_DEFAULT_BLOCKED_IP_RANGES, '100.0.0.0/8']
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

const positiveNumberSchema = z.coerce.number().gt(0);

@Config
export class SsrfProtectionConfig {
	/** Whether SSRF protection is enabled for nodes making HTTP requests to user-controllable targets. */
	@Env('N8N_SSRF_PROTECTION_ENABLED')
	enabled: boolean = false;

	/**
	 * Comma-separated CIDR ranges to block.
	 * Use `default` to include the standard set, optionally with custom ranges
	 * (for example: `default,100.0.0.0/8`).
	 */
	@Env('N8N_SSRF_BLOCKED_IP_RANGES', blockedIpRangesSchema)
	blockedIpRanges: string[] = [...SSRF_DEFAULT_BLOCKED_IP_RANGES];

	/** Comma-separated CIDR ranges to allow (takes precedence over the block list). */
	@Env('N8N_SSRF_ALLOWED_IP_RANGES')
	allowedIpRanges: CommaSeparatedStringArray<string> = [];

	/** Comma-separated hostname patterns to allow. Supports wildcards: *.n8n.internal */
	@Env('N8N_SSRF_ALLOWED_HOSTNAMES')
	allowedHostnames: CommaSeparatedStringArray<string> = [];

	/** Maximum DNS cache TTL in seconds. Default: 300. */
	@Env('N8N_SSRF_DNS_CACHE_MAX_TTL_SECONDS', positiveNumberSchema)
	dnsCacheMaxTtlSeconds: number = 300;

	/** Maximum DNS cache size in bytes (LRU eviction). Default: 1 MB. */
	@Env('N8N_SSRF_DNS_CACHE_MAX_SIZE')
	dnsCacheMaxSize: number = 1024 * 1024;
}
