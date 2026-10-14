/** Any origin works here; the check is only that the path resolves back onto it. */
const PLACEHOLDER_ORIGIN = 'https://n8n.invalid';

/**
 * Validates that a redirect URL is safe (relative path only, no external redirects).
 * Returns '/' if the URL is invalid or unsafe.
 */
export function validateRedirectUrl(redirectUrl: string): string {
	if (typeof redirectUrl !== 'string' || redirectUrl.trim() === '') {
		return '/';
	}

	const trimmed = redirectUrl.trim();

	// Only allow paths starting with /
	if (!trimmed.startsWith('/')) {
		return '/';
	}
	// Reject protocol-relative URLs (//example.com)
	if (trimmed.startsWith('//')) {
		return '/';
	}
	// Browsers read a backslash as a slash and drop tabs and newlines while they
	// parse a URL, so `/\example.com` and `/<tab>/example.com` also leave the instance.
	if (/[\\\t\n\r]/.test(trimmed)) {
		return '/';
	}
	// Let the URL parser have the final word: a relative path resolved against a
	// placeholder origin has to stay on that origin.
	try {
		if (new URL(trimmed, PLACEHOLDER_ORIGIN).origin !== PLACEHOLDER_ORIGIN) {
			return '/';
		}
	} catch {
		return '/';
	}

	return trimmed;
}
