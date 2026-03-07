/**
 * CORS utility functions for normalizing and handling Origin header values.
 *
 * Browsers send Origin headers in various formats:
 * - Standard origins: "https://example.com"
 * - Null origin (file:// URLs): "null" (literal string)
 * - Missing: undefined
 * - Wildcard: "*"
 *
 * These utilities provide consistent handling across all cases.
 */

/**
 * Normalizes an Origin header value to a consistent format.
 *
 * @param origin - The Origin header value from the request (may be undefined, "null", or a valid origin)
 * @returns Normalized origin value or undefined if missing
 */
export function normalizeOrigin(origin: string | undefined): string | undefined {
	if (!origin) {
		return undefined;
	}

	// Browsers from file:// URLs send "null" as a literal string
	// Normalize it to undefined for consistent handling
	if (origin === 'null') {
		return undefined;
	}

	return origin;
}

/**
 * Checks if an origin represents a null origin (file:// URLs).
 *
 * @param origin - The Origin header value
 * @returns true if the origin is null (file:// context)
 */
export function isNullOrigin(origin: string | undefined): boolean {
	return !origin || origin === 'null';
}

/**
 * Determines the appropriate Access-Control-Allow-Origin value based on policy and request origin.
 *
 * @param allowedOrigins - The allowed origins policy ("*" for wildcard, or comma-separated list)
 * @param requestOrigin - The Origin header from the request (may be normalized)
 * @returns The Access-Control-Allow-Origin header value
 */
export function determineAllowedOrigin(
	allowedOrigins: string | undefined,
	requestOrigin: string | undefined,
): string {
	// Wildcard policy: allow any origin
	if (allowedOrigins === '*') {
		// For null/missing origins with wildcard policy, use '*' explicitly
		// This ensures preflight succeeds even from file:// URLs
		if (isNullOrigin(requestOrigin)) {
			return '*';
		}
		// For valid origins with wildcard policy, echo back the origin
		return requestOrigin || '*';
	}

	// Specific origins policy: check if request origin matches
	if (allowedOrigins) {
		const originsList = allowedOrigins.split(',').map((o) => o.trim());
		const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

		if (normalizedRequestOrigin && originsList.includes(normalizedRequestOrigin)) {
			return normalizedRequestOrigin;
		}

		// Request origin doesn't match - use first allowed origin as fallback
		// This is intentional: we don't want to fail preflight, but also don't allow unauthorized origins
		if (originsList.length > 0) {
			return originsList[0];
		}
	}

	// No policy specified: echo back origin if present, otherwise use wildcard for preflight
	return requestOrigin || '*';
}
