import { VIEWS } from '@/constants';
import type { AuthenticatedPermissionOptions } from '@/types/rbac';
import type { RouterMiddleware } from '@/types/router';
import { isAuthenticated, shouldEnableMfa } from '@/utils/rbac/checks';

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

export const authenticatedMiddleware: RouterMiddleware<AuthenticatedPermissionOptions> = async (
	to,
	_from,
	next,
	options,
) => {
	// Security: ensure that we are removing the already existing redirect query parameter
	// to avoid infinite redirect loops
	const url = new URL(window.location.href);
	url.searchParams.delete('redirect');

	// Security: Validate and sanitize the redirect parameter
	const redirectParam = to.query.redirect as string;
	const validatedRedirect = validateRedirectUrl(redirectParam);

	// Security: Use validated redirect or fallback to current path
	const safeRedirect = validatedRedirect || encodeURIComponent(`${url.pathname}${url.search}`);

	const valid = isAuthenticated(options);
	if (!valid) {
		return next({ name: VIEWS.SIGNIN, query: { redirect: safeRedirect } });
	}

	// If MFA is not enabled, and the instance enforces MFA, redirect to personal settings
	const mfaNeeded = shouldEnableMfa();
	if (mfaNeeded) {
		if (to.name !== VIEWS.PERSONAL_SETTINGS) {
			return next({ name: VIEWS.PERSONAL_SETTINGS, query: { redirect: safeRedirect } });
		}
		return;
	}
};
