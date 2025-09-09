import type { Request } from 'express';

export interface OriginValidationResult {
	isValid: boolean;
	originInfo?: { protocol: 'http' | 'https'; host: string };
	expectedHost?: string;
	expectedProtocol?: 'http' | 'https';
	rawExpectedHost?: string;
	error?: string;
}

/**
 * Validates origin headers against expected host from proxy headers.
 * Handles X-Forwarded-Host, X-Forwarded-Proto, and RFC 7239 Forwarded headers.
 *
 * @param headers HTTP request headers
 * @returns Validation result with details about the origin check
 */
export function validateOriginHeaders(headers: Request['headers']): OriginValidationResult {
	// Parse and normalize the origin using native URL class
	const originInfo = parseOrigin(headers.origin ?? '');

	if (!originInfo) {
		return {
			isValid: false,
			error: 'Origin header is missing or malformed',
		};
	}

	// Extract expected host from proxy headers using same precedence logic
	let rawExpectedHost: string | undefined;
	let expectedProtocol = originInfo.protocol;

	// 1. Try RFC 7239 Forwarded header first
	const forwarded = parseForwardedHeader(headers.forwarded ?? '');
	if (forwarded?.host) {
		rawExpectedHost = forwarded.host;
		if (forwarded.proto) {
			const validatedProto = validateProtocol(forwarded.proto);
			if (validatedProto) {
				expectedProtocol = validatedProto;
			}
		}
	}
	// 2. Try X-Forwarded-Host
	else {
		const xForwardedHost = getFirstHeaderValue(headers['x-forwarded-host']);
		if (xForwardedHost) {
			rawExpectedHost = xForwardedHost;
			const xForwardedProto = getFirstHeaderValue(headers['x-forwarded-proto']);
			if (xForwardedProto) {
				const validatedProto = validateProtocol(xForwardedProto.split(',')[0]?.trim());
				if (validatedProto) {
					expectedProtocol = validatedProto;
				}
			}
		}
		// 3. Fallback to Host header
		else {
			rawExpectedHost = headers.host;
		}
	}

	// Normalize expected host using the determined protocol
	const normalizedExpectedHost = normalizeHost(rawExpectedHost ?? '', expectedProtocol);

	const isValid = normalizedExpectedHost === originInfo.host;

	return {
		isValid,
		originInfo,
		expectedHost: normalizedExpectedHost,
		expectedProtocol,
		rawExpectedHost,
		error: isValid ? undefined : 'Origin header does not match expected host',
	};
}

/**
 * Normalizes a host by removing default ports for the given protocol.
 * Uses native URL class for robust parsing of hosts and ports.
 *
 * @param host The host string (e.g., "example.com:80", "example.com", "[::1]:8080")
 * @param protocol The protocol ('http' or 'https')
 * @returns The normalized host string with default ports removed
 */
function normalizeHost(host: string, protocol: 'http' | 'https'): string {
	if (!host) return host;

	try {
		// Use URL constructor to parse the host properly
		// We need to prepend a protocol to make it a valid URL
		const url = new URL(`${protocol}://${host}`);

		// URL.host includes port, URL.hostname excludes port
		// If the port is default for the protocol, URL.host will exclude it
		// Otherwise, it will include it
		const defaultPort = protocol === 'https' ? '443' : '80';
		const actualPort = url.port || defaultPort;

		// If the port matches the default, return hostname only (strip IPv6 brackets)
		if (actualPort === defaultPort) {
			return stripIPv6Brackets(url.hostname);
		}

		// Return hostname:port for non-default ports (strip IPv6 brackets)
		return stripIPv6Brackets(url.host);
	} catch {
		// If URL parsing fails, fall back to original host
		return host;
	}
}

/**
 * Strips brackets from IPv6 addresses for consistency.
 * IPv6 brackets are URL syntax and should be removed when comparing hosts.
 *
 * @param hostname The hostname that may contain IPv6 brackets (e.g., "[::1]" or "[::1]:8080")
 * @returns Hostname with IPv6 brackets removed if present (e.g., "::1" or "::1:8080")
 */
function stripIPv6Brackets(hostname: string): string {
	// Handle IPv6 with port: [::1]:8080 -> ::1:8080
	if (hostname.startsWith('[') && hostname.includes(']:')) {
		const closingBracket = hostname.indexOf(']:');
		const ipv6 = hostname.slice(1, closingBracket); // Extract ::1
		const port = hostname.slice(closingBracket + 2); // Extract 8080
		return `${ipv6}:${port}`;
	}
	// Handle IPv6 without port: [::1] -> ::1
	if (hostname.startsWith('[') && hostname.endsWith(']')) {
		return hostname.slice(1, -1);
	}
	return hostname;
}

/**
 * Safely extracts the first value from a header that could be string or string[].
 *
 * @param header The header value (string or string[])
 * @returns First header value or undefined
 */
function getFirstHeaderValue(header: string | string[] | undefined): string | undefined {
	if (!header) return undefined;
	if (typeof header === 'string') return header;
	return header[0]; // Take first value from array
}

/**
 * Validates and normalizes a protocol value to ensure it's http or https.
 *
 * @param proto Protocol value from headers
 * @returns 'http' or 'https' if valid, undefined if invalid
 */
function validateProtocol(proto: string | undefined): 'http' | 'https' | undefined {
	if (!proto) return undefined;
	const normalized = proto.toLowerCase().trim();
	return normalized === 'http' || normalized === 'https' ? normalized : undefined;
}

/**
 * Parses the RFC 7239 Forwarded header to extract host and proto values.
 *
 * @param forwardedHeader The Forwarded header value (e.g., "for=192.0.2.60;proto=http;host=example.com")
 * @returns Object with host and proto, or null if parsing fails
 */
function parseForwardedHeader(forwardedHeader: string): { host?: string; proto?: string } | null {
	if (!forwardedHeader || typeof forwardedHeader !== 'string') {
		return null;
	}

	try {
		// Parse the first forwarded entry (comma-separated list)
		const firstEntry = forwardedHeader.split(',')[0]?.trim();
		if (!firstEntry) return null;

		const result: { host?: string; proto?: string } = {};

		// Parse semicolon-separated key=value pairs
		const pairs = firstEntry.split(';');
		for (const pair of pairs) {
			const [key, value] = pair.split('=', 2);
			if (!key || !value) continue;

			const cleanKey = key.trim().toLowerCase();
			const cleanValue = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes

			if (cleanKey === 'host') {
				result.host = cleanValue;
			} else if (cleanKey === 'proto') {
				result.proto = cleanValue;
			}
		}

		return result;
	} catch {
		return null;
	}
}

/**
 * Extracts protocol and normalized host from an origin URL using native URL class.
 *
 * @param origin The origin URL (e.g., "https://example.com", "http://localhost:3000")
 * @returns Object with protocol and normalized host, or null if invalid
 */
function parseOrigin(origin: string): { protocol: 'http' | 'https'; host: string } | null {
	if (!origin || typeof origin !== 'string') {
		return null;
	}

	try {
		const url = new URL(origin);
		const protocol = url.protocol.toLowerCase();

		if (protocol !== 'http:' && protocol !== 'https:') {
			return null;
		}

		const protocolName = protocol === 'https:' ? 'https' : 'http';

		// Use the same normalization logic - remove default ports and IPv6 brackets
		const defaultPort = protocolName === 'https' ? '443' : '80';
		const actualPort = url.port || defaultPort;

		const rawHost = actualPort === defaultPort ? url.hostname : url.host;
		const normalizedHost = stripIPv6Brackets(rawHost);

		return {
			protocol: protocolName,
			host: normalizedHost,
		};
	} catch {
		// Invalid URL format
		return null;
	}
}
