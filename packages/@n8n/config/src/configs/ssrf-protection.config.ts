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

@Config
export class SsrfProtectionConfig {
	/** Whether SSRF protection is enabled for nodes making HTTP requests to user-controllable targets. */
	@Env('N8N_SSRF_PROTECTION_ENABLED')
	enabled: boolean = false;

	/**
	 * Comma-separated CIDR ranges to block, or 'default' for the standard set.
	 * Use `resolvedBlockedIpRanges` at runtime instead of reading this directly.
	 */
	@Env('N8N_SSRF_BLOCKED_IP_RANGES')
	blockedIpRanges: string = 'default';

	/** Comma-separated CIDR ranges to allow (takes precedence over the block list). */
	@Env('N8N_SSRF_ALLOWED_IP_RANGES')
	allowedIpRanges: CommaSeparatedStringArray<string> = [];

	/** Comma-separated hostname patterns to allow. Supports wildcards: *.n8n.internal */
	@Env('N8N_SSRF_ALLOWED_HOSTNAMES')
	allowedHostnames: CommaSeparatedStringArray<string> = [];

	/** Maximum DNS cache TTL in seconds. Default: 300. */
	@Env('N8N_SSRF_DNS_CACHE_MAX_TTL_SECONDS')
	dnsCacheMaxTtlSeconds: number = 300;

	/** Maximum DNS cache size in bytes (LRU eviction). Default: 1 MB. */
	@Env('N8N_SSRF_DNS_CACHE_MAX_SIZE')
	dnsCacheMaxSize: number = 1024 * 1024;

	/** Resolved list of blocked IP ranges after 'default' expansion. */
	resolvedBlockedIpRanges: readonly string[] = [];

	sanitize() {
		if (this.blockedIpRanges === 'default') {
			this.resolvedBlockedIpRanges = SSRF_DEFAULT_BLOCKED_IP_RANGES;
			return;
		}

		this.resolvedBlockedIpRanges = this.blockedIpRanges
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}
}
