/**
 * Static utility functions for OAuth URL building
 */
export class OAuthHelpers {
	/**
	 * Canonical RFC 8414/9207 issuer identifier for a given instance base URL.
	 *
	 * The `server-legacy/auth` authorize handler derives the RFC 9207 `iss`
	 * parameter from `issuerUrl.href`, so an origin-only base URL comes back with
	 * a trailing slash (`https://host` → `https://host/`). RFC 9207 requires the
	 * `iss` on every authorization response to be byte-identical to the `issuer`
	 * advertised in metadata, so the metadata document and the consent redirects
	 * must use this same `href` normalization rather than the bare base URL.
	 */
	static canonicalIssuer(baseUrl: string): string {
		return new URL(baseUrl).href;
	}

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
}
