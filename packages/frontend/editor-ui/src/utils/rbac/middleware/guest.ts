import { VIEWS } from '@/constants';
import type { GuestPermissionOptions } from '@/types/rbac';
import type { RouterMiddleware } from '@/types/router';
import { isGuest } from '@/utils/rbac/checks';

/**
 * Validates and sanitizes redirect URLs to prevent Open Redirect attacks
 */
function validateRedirectUrl(redirect: string): string | null {
	// Security: Handle empty or invalid redirects
	if (!redirect || typeof redirect !== 'string') {
		return null;
	}

	// Security: Trim whitespace and decode URL
	const sanitizedRedirect = decodeURIComponent(redirect.trim());

	// Security: Remove control characters and null bytes
	const cleanRedirect = sanitizedRedirect.replace(/[\x00-\x1F\x7F]/g, '');

	// Security: Limit redirect URL length to prevent DoS
	if (cleanRedirect.length > 2048) {
		console.warn('Redirect URL too long, blocking:', cleanRedirect);
		return null;
	}

	// Security: Block dangerous protocols
	const dangerousProtocols = [
		'javascript:',
		'data:',
		'vbscript:',
		'file:',
		'about:',
		'chrome:',
		'moz-extension:',
		'chrome-extension:',
	];

	for (const protocol of dangerousProtocols) {
		if (cleanRedirect.toLowerCase().startsWith(protocol)) {
			console.warn('Dangerous protocol in redirect URL:', cleanRedirect);
			return null;
		}
	}

	// Security: Block suspicious patterns
	const suspiciousPatterns = [
		/\/\/[^\/]*\.(local|test|dev|localhost)/i, // Local domains
		/\/\/[^\/]*\.(evil|malicious|phish|fake)/i, // Obviously malicious domains
		/\/\/[^\/]*\.(tk|ml|ga|cf|gq)/i, // Free domains often used for phishing
	];

	for (const pattern of suspiciousPatterns) {
		if (pattern.test(cleanRedirect)) {
			console.warn('Suspicious redirect URL pattern detected:', cleanRedirect);
			return null;
		}
	}

	return cleanRedirect;
}

export const guestMiddleware: RouterMiddleware<GuestPermissionOptions> = async (
	to,
	_from,
	next,
) => {
	const valid = isGuest();
	if (!valid) {
		const redirectParam = (to.query.redirect as string) ?? '';
		const validatedRedirect = validateRedirectUrl(redirectParam);

		// Security: Allow local path redirects
		if (validatedRedirect && validatedRedirect.startsWith('/')) {
			// Security: Additional validation for local paths
			try {
				// Use URL constructor to validate the path
				new URL(validatedRedirect, window.location.origin);
				return next(validatedRedirect);
			} catch {
				console.warn('Invalid local redirect path:', validatedRedirect);
				return next({ name: VIEWS.HOMEPAGE });
			}
		}

		// Security: Only allow origin domain redirects
		if (validatedRedirect) {
			try {
				const url = new URL(validatedRedirect);
				if (url.origin === window.location.origin) {
					return next(validatedRedirect);
				} else {
					console.warn('Cross-origin redirect blocked:', validatedRedirect);
				}
			} catch {
				console.warn('Invalid redirect URL format:', validatedRedirect);
			}
		}

		// Security: Default to homepage for any invalid redirects
		return next({ name: VIEWS.HOMEPAGE });
	}
};
