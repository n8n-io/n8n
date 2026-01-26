/**
 * Static utility functions for OAuth URL building
 */
export class McpOAuthHelpers {
	/**
	 * Build success redirect URL with authorization code
	 * Used when user approves consent
	 */
	static buildSuccessRedirectUrl(redirectUri: string, code: string, state: string | null): string {
		const targetUrl = new URL(redirectUri);
		targetUrl.searchParams.set('code', code);
		if (state) {
			targetUrl.searchParams.set('state', state);
		}
		return targetUrl.toString();
	}

	/**
	 * Build error redirect URL
	 * Used when user denies consent or errors occur
	 */
	static buildErrorRedirectUrl(
		redirectUri: string,
		error: string,
		errorDescription: string,
		state: string | null,
	): string {
		const targetUrl = new URL(redirectUri);
		targetUrl.searchParams.set('error', error);
		targetUrl.searchParams.set('error_description', errorDescription);
		if (state) {
			targetUrl.searchParams.set('state', state);
		}
		return targetUrl.toString();
	}
}
