/**
 * Static utility functions for OAuth URL building
 */
export class OAuthHelpers {
	/**
	 * Build success redirect URL with authorization code
	 * Used when user approves consent
	 *
	 * `issuer` is the RFC 9207 issuer identifier (the instance origin, matching
	 * the `issuer` advertised in authorization-server metadata). Clients use it
	 * to detect authorization-server mix-up.
	 */
	static buildSuccessRedirectUrl(
		redirectUri: string,
		code: string,
		state: string | null,
		issuer: string,
	): string {
		const targetUrl = new URL(redirectUri);
		targetUrl.searchParams.set('code', code);
		if (state) {
			targetUrl.searchParams.set('state', state);
		}
		targetUrl.searchParams.set('iss', issuer);
		return targetUrl.toString();
	}

	/**
	 * Build error redirect URL
	 * Used when user denies consent or errors occur
	 *
	 * `issuer` is the RFC 9207 issuer identifier; see `buildSuccessRedirectUrl`.
	 */
	static buildErrorRedirectUrl(
		redirectUri: string,
		error: string,
		errorDescription: string,
		state: string | null,
		issuer: string,
	): string {
		const targetUrl = new URL(redirectUri);
		targetUrl.searchParams.set('error', error);
		targetUrl.searchParams.set('error_description', errorDescription);
		if (state) {
			targetUrl.searchParams.set('state', state);
		}
		targetUrl.searchParams.set('iss', issuer);
		return targetUrl.toString();
	}

	/**
	 * Set the RFC 9207 `iss` parameter on an absolute redirect URL, replacing
	 * any pre-existing value (e.g. one baked into the client's registered
	 * redirect URI) so the response always asserts this server's identity.
	 * Relative URLs (internal redirects, e.g. to the consent screen) are
	 * returned unchanged.
	 */
	static setIssuerParam(url: string, issuer: string): string {
		if (!URL.canParse(url)) return url;

		const targetUrl = new URL(url);
		targetUrl.searchParams.set('iss', issuer);
		return targetUrl.toString();
	}
}
