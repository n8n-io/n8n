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

	return trimmed;
}
