// Source: https://github.com/openai/openai-guardrails-js/blob/b9b99b4fb454f02a362c2836aec6285176ec40a8/src/checks/urls.ts

import type { CreateCheckFn, GuardrailResult } from '../types';

export type UrlsConfig = {
	allowedUrls: string[];
	allowedSchemes: string[];
	blockUserinfo: boolean;
	allowSubdomains: boolean;
};

/**
 * Convert IPv4 address string to 32-bit integer for CIDR calculations.
 */
function ipToInt(ip: string): number {
	const parts = ip.split('.').map(Number);
	if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
		throw new Error(`Invalid IP address: ${ip}`);
	}
	return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Detect URLs in text using robust regex patterns.
 */
function detectUrls(text: string): string[] {
	// Pattern for cleaning trailing punctuation (] must be escaped)
	const PUNCTUATION_CLEANUP = /[.,;:!?)\\]]+$/;

	const detectedUrls: string[] = [];

	// Pattern 1: URLs with schemes (highest priority)
	const schemePatterns = [
		/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
		/ftp:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
		/data:[^\s<>"{}|\\^`\[\]]+/gi,
		/javascript:[^\s<>"{}|\\^`\[\]]+/gi,
		/vbscript:[^\s<>"{}|\\^`\[\]]+/gi,
		/mailto:[^\s<>"{}|\\^`\[\]]+/gi,
	];

	const schemeUrls = new Set<string>();
	for (const pattern of schemePatterns) {
		const matches = text.match(pattern) || [];
		for (let match of matches) {
			// Clean trailing punctuation
			match = match.replace(PUNCTUATION_CLEANUP, '');
			if (match) {
				detectedUrls.push(match);
				// Track the domain part to avoid duplicates
				if (match.includes('://')) {
					const domainPart = match.split('://', 2)[1].split('/')[0].split('?')[0].split('#')[0];
					schemeUrls.add(domainPart.toLowerCase());
				}
			}
		}
	}

	// Pattern 2: Domain-like patterns without schemes (exclude already found)
	const domainPattern = /\b(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
	const domainMatches = text.match(domainPattern) || [];

	for (let match of domainMatches) {
		// Clean trailing punctuation
		match = match.replace(PUNCTUATION_CLEANUP, '');
		if (match) {
			// Extract just the domain part for comparison
			const domainPart = match.split('/')[0].split('?')[0].split('#')[0].toLowerCase();
			// Only add if we haven't already found this domain with a scheme
			if (!schemeUrls.has(domainPart)) {
				detectedUrls.push(match);
			}
		}
	}

	// Pattern 3: IP addresses (exclude already found)
	const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?(?:\/[^\s]*)?/g;
	const ipMatches = text.match(ipPattern) || [];

	for (let match of ipMatches) {
		// Clean trailing punctuation
		match = match.replace(PUNCTUATION_CLEANUP, '');
		if (match) {
			// Extract IP part for comparison
			const ipPart = match.split('/')[0].split('?')[0].split('#')[0].toLowerCase();
			if (!schemeUrls.has(ipPart)) {
				detectedUrls.push(match);
			}
		}
	}

	// Advanced deduplication: Remove domains that are already part of full URLs
	const finalUrls: string[] = [];
	const schemeUrlDomains = new Set<string>();

	// First pass: collect all domains from scheme-ful URLs
	for (const url of detectedUrls) {
		if (url.includes('://')) {
			try {
				const parsed = new URL(url);
				if (parsed.hostname) {
					schemeUrlDomains.add(parsed.hostname.toLowerCase());
					// Also add www-stripped version
					const bareDomain = parsed.hostname.toLowerCase().replace(/^www\./, '');
					schemeUrlDomains.add(bareDomain);
				}
			} catch (error) {
				// Skip URLs with parsing errors (malformed URLs, encoding issues)
				// This is expected for edge cases and doesn't require logging
			}
			finalUrls.push(url);
		}
	}

	// Second pass: only add scheme-less URLs if their domain isn't already covered
	for (const url of detectedUrls) {
		if (!url.includes('://')) {
			// Check if this domain is already covered by a full URL
			const urlLower = url.toLowerCase().replace(/^www\./, '');
			if (!schemeUrlDomains.has(urlLower)) {
				finalUrls.push(url);
			}
		}
	}

	// Remove empty URLs and return unique list
	return [...new Set(finalUrls.filter((url) => url))];
}

/**
 * Validate URL against security configuration.
 */
function validateUrlSecurity(
	urlString: string,
	config: UrlsConfig,
): { parsedUrl: URL | null; reason: string } {
	try {
		let parsedUrl: URL;
		let originalScheme: string;

		// Parse URL - preserve original scheme for validation
		if (urlString.includes('://')) {
			// Standard URL with double-slash scheme (http://, https://, ftp://, etc.)
			parsedUrl = new URL(urlString);
			originalScheme = parsedUrl.protocol.replace(':', '');
		} else if (
			urlString.includes(':') &&
			urlString.split(':', 1)[0].match(/^(data|javascript|vbscript|mailto)$/)
		) {
			// Special single-colon schemes
			parsedUrl = new URL(urlString);
			originalScheme = parsedUrl.protocol.replace(':', '');
		} else {
			// Add http scheme for parsing, but remember this is a default
			parsedUrl = new URL(`http://${urlString}`);
			originalScheme = 'http'; // Default scheme for scheme-less URLs
		}

		// Basic validation: must have scheme and hostname (except for special schemes)
		if (!parsedUrl.protocol) {
			return { parsedUrl: null, reason: 'Invalid URL format' };
		}

		// Special schemes like data: and javascript: don't need hostname
		const specialSchemes = new Set(['data:', 'javascript:', 'vbscript:', 'mailto:']);
		if (!specialSchemes.has(parsedUrl.protocol) && !parsedUrl.hostname) {
			return { parsedUrl: null, reason: 'Invalid URL format' };
		}

		// Security validations - use original scheme
		if (!config.allowedSchemes.includes(originalScheme)) {
			return { parsedUrl: null, reason: `Blocked scheme: ${originalScheme}` };
		}

		if (config.blockUserinfo && (parsedUrl.username || parsedUrl.password)) {
			return { parsedUrl: null, reason: 'Contains userinfo (potential credential injection)' };
		}

		// Everything else (IPs, localhost, private IPs) goes through allow list logic
		return { parsedUrl, reason: '' };
	} catch (error) {
		// Provide specific error information for debugging
		const errorMessage = error instanceof Error ? error.message : String(error);
		return { parsedUrl: null, reason: `Invalid URL format: ${errorMessage}` };
	}
}

/**
 * Check if URL is allowed based on the allow list configuration.
 */
function isUrlAllowed(parsedUrl: URL, allowList: string[], allowSubdomains: boolean): boolean {
	if (allowList.length === 0) {
		return false;
	}

	const urlHost = parsedUrl.hostname?.toLowerCase();
	if (!urlHost) {
		return false;
	}

	for (const allowedEntry of allowList) {
		const entry = allowedEntry.toLowerCase().trim();

		// Handle full URLs with specific paths
		if (entry.includes('://')) {
			try {
				const allowedUrl = new URL(entry);
				const allowedHost = allowedUrl.hostname?.toLowerCase();
				const allowedPath = allowedUrl.pathname;

				if (urlHost === allowedHost) {
					// Check if the URL path starts with the allowed path
					if (!allowedPath || allowedPath === '/' || parsedUrl.pathname.startsWith(allowedPath)) {
						return true;
					}
				}
			} catch (error) {
				throw new Error(
					`Invalid URL in allow list: "${entry}" - ${error instanceof Error ? error.message : error}`,
				);
			}
			continue;
		}

		// Handle IP addresses and CIDR blocks
		try {
			// Basic IP pattern check
			if (/^\d+\.\d+\.\d+\.\d+/.test(entry.split('/')[0])) {
				if (entry === urlHost) {
					return true;
				}
				// Proper CIDR validation
				if (entry.includes('/') && urlHost.match(/^\d+\.\d+\.\d+\.\d+$/)) {
					const [network, prefixStr] = entry.split('/');
					const prefix = parseInt(prefixStr);

					if (prefix >= 0 && prefix <= 32) {
						// Convert IPs to 32-bit integers for bitwise comparison
						const networkInt = ipToInt(network);
						const hostInt = ipToInt(urlHost);

						// Create subnet mask
						const mask = (0xffffffff << (32 - prefix)) >>> 0;

						// Check if host is in the network
						if ((networkInt & mask) === (hostInt & mask)) {
							return true;
						}
					}
				}
				continue;
			}
		} catch (error) {
			// Expected: entry is not an IP address/CIDR, continue to domain matching
			// Only log if it looks like it was intended to be an IP but failed parsing
			if (/^\d+\.\d+/.test(entry)) {
				console.warn(
					`Warning: Malformed IP address in allow list: "${entry}" - ${error instanceof Error ? error.message : error}`,
				);
			}
		}

		// Handle domain matching
		const allowedDomain = entry.replace(/^www\./, '');
		const urlDomain = urlHost.replace(/^www\./, '');

		// Exact match always allowed
		if (urlDomain === allowedDomain) {
			return true;
		}

		// Subdomain matching if enabled
		if (allowSubdomains && urlDomain.endsWith(`.${allowedDomain}`)) {
			return true;
		}
	}

	return false;
}

/**
 * Main URL filtering function.
 */
export const urls = (data: string, config: UrlsConfig): GuardrailResult => {
	// Detect URLs in the text
	const detectedUrls = detectUrls(data);

	const allowed: string[] = [];
	const blocked: string[] = [];
	const blockedReasons: string[] = [];

	for (const urlString of detectedUrls) {
		// Validate URL with security checks
		const { parsedUrl, reason } = validateUrlSecurity(urlString, config);

		if (parsedUrl === null) {
			blocked.push(urlString);
			blockedReasons.push(`${urlString}: ${reason}`);
			continue;
		}

		// Check against allow list
		// Special schemes (data:, javascript:, mailto:) don't have meaningful hosts
		// so they only need scheme validation, not host-based allow list checking
		const hostlessSchemes = new Set(['data:', 'javascript:', 'vbscript:', 'mailto:']);
		if (hostlessSchemes.has(parsedUrl.protocol)) {
			// For hostless schemes, only scheme permission matters (no allow list needed)
			// They were already validated for scheme permission in validateUrlSecurity
			allowed.push(urlString);
		} else if (isUrlAllowed(parsedUrl, config.allowedUrls, config.allowSubdomains)) {
			allowed.push(urlString);
		} else {
			blocked.push(urlString);
			blockedReasons.push(`${urlString}: Not in allow list`);
		}
	}

	const tripwireTriggered = blocked.length > 0;

	return {
		guardrailName: 'urls',
		tripwireTriggered,
		info: {
			maskEntities: {
				URL: blocked,
			},
			detected: detectedUrls,
			allowed,
			blocked,
			blockedReasons,
		},
	};
};

export const createUrlsCheckFn: CreateCheckFn<UrlsConfig> = (config) => (input: string) =>
	urls(input, config);
