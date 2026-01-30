import { UnexpectedError } from 'n8n-workflow';

/**
 * Pattern shortcuts for common URL blocking scenarios.
 * These expand to specific IP patterns when used in N8N_HTTP_REQUEST_BLOCK.
 */
const PATTERN_SHORTCUTS: Record<string, string[]> = {
	// Cloud metadata endpoints (AWS, GCP, Azure all use this IP)
	'cloud-metadata': ['169.254.169.254'],

	// All link-local addresses (APIPA - Automatic Private IP Addressing)
	// Includes cloud metadata endpoint
	apipa: ['169.254.*'],

	// RFC 1918 private IP ranges
	'private-ip': [
		'10.*', // 10.0.0.0/8
		'172.16.*',
		'172.17.*',
		'172.18.*',
		'172.19.*',
		'172.20.*',
		'172.21.*',
		'172.22.*',
		'172.23.*',
		'172.24.*',
		'172.25.*',
		'172.26.*',
		'172.27.*',
		'172.28.*',
		'172.29.*',
		'172.30.*',
		'172.31.*', // 172.16.0.0/12
		'192.168.*', // 192.168.0.0/16
	],

	// Loopback addresses
	localhost: ['127.*', '::1', 'localhost'],
};

/**
 * Expand pattern shortcuts to their actual patterns.
 * Patterns that are not shortcuts are passed through unchanged.
 */
export function expandPatterns(patterns: string[]): string[] {
	const expanded: string[] = [];

	for (const pattern of patterns) {
		const trimmed = pattern.trim().toLowerCase();
		if (!trimmed) continue;

		if (trimmed in PATTERN_SHORTCUTS) {
			expanded.push(...PATTERN_SHORTCUTS[trimmed]);
		} else {
			expanded.push(trimmed);
		}
	}

	return expanded;
}

/**
 * Check if a hostname/IP matches a pattern.
 * Supports wildcards (*) at the end of patterns.
 *
 * @example
 * matchesPattern('169.254.169.254', '169.254.*') // true
 * matchesPattern('10.0.0.1', '10.*') // true
 * matchesPattern('localhost', 'localhost') // true
 */
export function matchesPattern(hostname: string, pattern: string): boolean {
	const normalizedHostname = hostname.toLowerCase();
	const normalizedPattern = pattern.toLowerCase();

	// Exact match
	if (normalizedHostname === normalizedPattern) {
		return true;
	}

	// Wildcard match (pattern ends with *)
	if (normalizedPattern.endsWith('*')) {
		const prefix = normalizedPattern.slice(0, -1);
		return normalizedHostname.startsWith(prefix);
	}

	return false;
}

/**
 * Check if a URL's hostname matches any pattern in the blocklist.
 */
export function matchesBlocklist(url: string, blocklist: string[]): boolean {
	let hostname: string;

	try {
		const parsedUrl = new URL(url);
		hostname = parsedUrl.hostname.toLowerCase();

		// Handle IPv6 addresses wrapped in brackets
		if (hostname.startsWith('[') && hostname.endsWith(']')) {
			hostname = hostname.slice(1, -1);
		}
	} catch {
		// If URL parsing fails, we can't validate it
		return false;
	}

	for (const pattern of blocklist) {
		if (matchesPattern(hostname, pattern)) {
			return true;
		}
	}

	return false;
}

/**
 * Validate a URL against the configured blocklist.
 * Throws an error if the URL matches any blocked pattern.
 *
 * @param url - The URL to validate
 * @param blocklistConfig - Comma-separated blocklist configuration string
 * @throws {UnexpectedError} If the URL matches a blocked pattern
 */
export function validateUrlAgainstBlocklist(url: string, blocklistConfig: string): void {
	// No blocklist configured = allow all
	if (!blocklistConfig || blocklistConfig.trim() === '') {
		return;
	}

	const patterns = blocklistConfig.split(',').map((p) => p.trim());
	const expandedPatterns = expandPatterns(patterns);

	if (matchesBlocklist(url, expandedPatterns)) {
		let hostname: string;
		try {
			hostname = new URL(url).hostname;
		} catch {
			hostname = url;
		}

		throw new UnexpectedError(
			`Request blocked: The URL targets "${hostname}" which matches a blocked pattern. ` +
				'This is configured via N8N_HTTP_REQUEST_BLOCK for security reasons.',
		);
	}
}
