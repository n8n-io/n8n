const SUPPRESSION_KEY = 'n8n:sso:suppress-login-redirect';

/**
 * Marks that the next visit to the sign-in page must NOT auto-redirect to the SSO
 * provider. Set right before a sign-out navigation so a still-active identity-provider
 * session does not immediately re-authenticate the user (which would make logout appear
 * to do nothing). Uses `sessionStorage` so it survives the round-trip through an external
 * provider logout page (same tab, same origin) without needing a URL parameter.
 */
export function suppressNextSsoLoginRedirect(): void {
	try {
		sessionStorage.setItem(SUPPRESSION_KEY, 'true');
	} catch {
		// sessionStorage can be unavailable (private mode, disabled storage); the
		// redirect simply happens, which is acceptable.
	}
}

/** Reads and clears the one-shot suppression flag. */
export function consumeSsoLoginRedirectSuppression(): boolean {
	try {
		const value = sessionStorage.getItem(SUPPRESSION_KEY);
		if (value !== null) sessionStorage.removeItem(SUPPRESSION_KEY);
		return value === 'true';
	} catch {
		return false;
	}
}
