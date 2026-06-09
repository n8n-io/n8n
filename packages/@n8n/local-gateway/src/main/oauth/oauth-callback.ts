import { OAUTH_CONFIG } from './oauth-config';

/** Parsed result of an OAuth redirect deep link. */
export interface OAuthCallback {
	/** Authorization code (present on success). */
	code?: string;
	/** Echoed `state`; verified against the pending request before use. */
	state: string | null;
	/** OAuth error code (RFC 6749 §4.1.2.1), e.g. `access_denied`. */
	error?: string;
	errorDescription?: string;
}

/**
 * Parse a `n8n://callback?...` OAuth redirect deep link. Returns `null` for
 * any URL that isn't an OAuth callback (e.g. the legacy `connect` deep link), so
 * the dispatcher can fall through to other handlers.
 */
export function parseOAuthCallback(rawUrl: string): OAuthCallback | null {
	let url: URL;
	let expected: URL;
	try {
		url = new URL(rawUrl);
		expected = new URL(OAUTH_CONFIG.redirectUri);
	} catch {
		return null;
	}

	if (url.protocol !== expected.protocol || url.hostname !== expected.hostname) return null;

	const params = url.searchParams;
	const state = params.get('state');

	const error = params.get('error');
	if (error) {
		return { state, error, errorDescription: params.get('error_description') ?? undefined };
	}

	const code = params.get('code');
	if (!code) {
		// The URL matched our redirect URI but carries neither a code nor an error, so it's a
		// malformed callback — surface it as a failed authorization rather than silently dropping it.
		return {
			state,
			error: 'invalid_callback',
			errorDescription: 'OAuth callback was missing both code and error parameters',
		};
	}

	return { code, state };
}
