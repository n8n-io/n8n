export const OAUTH_CALLBACK_SUCCESS = 'success';
export const OAUTH_CALLBACK_ERROR = 'error';

export type OAuthCallbackResult = typeof OAUTH_CALLBACK_SUCCESS | typeof OAUTH_CALLBACK_ERROR;

interface OAuthErrorPayload {
	type: typeof OAUTH_CALLBACK_ERROR;
	message?: unknown;
}

/**
 * The OAuth callback page is served by the n8n backend and notifies the editor
 * UI that the flow finished. It signals completion over two channels:
 *
 * - `BroadcastChannel('oauth-callback')` — works when the callback page and the
 *   editor share the same origin.
 * - `window.opener.postMessage` — needed for embed setups where the editor and
 *   the n8n backend are served from different origins, which `BroadcastChannel`
 *   cannot bridge.
 *
 * Because any page can post a message to `window`, the `window` path must be
 * validated against the origins we trust (the current page and the configured
 * n8n editor base URL) and against the known payloads.
 */
export function getTrustedOAuthOrigins(editorBaseUrl: string): string[] {
	const origins = new Set<string>([window.location.origin]);
	try {
		origins.add(new URL(editorBaseUrl, window.location.origin).origin);
	} catch {
		// Ignore malformed base URLs; the current origin is still trusted.
	}
	return [...origins];
}

function isOAuthErrorPayload(data: unknown): data is OAuthErrorPayload {
	return (
		typeof data === 'object' &&
		data !== null &&
		'type' in data &&
		data.type === OAUTH_CALLBACK_ERROR
	);
}

/**
 * Validate an incoming `window` `message` event and return the OAuth result it
 * carries, or `null` when the event should be ignored (untrusted origin or an
 * unrelated payload). Accepts the legacy string `'error'` and the structured
 * `{ type: 'error', message }` payload from `oauth-error-callback`.
 */
export function parseOAuthCallbackMessage(
	event: MessageEvent,
	trustedOrigins: string[],
): OAuthCallbackResult | null {
	if (!trustedOrigins.includes(event.origin)) return null;
	if (event.data === OAUTH_CALLBACK_SUCCESS) return OAUTH_CALLBACK_SUCCESS;
	if (event.data === OAUTH_CALLBACK_ERROR || isOAuthErrorPayload(event.data)) {
		return OAUTH_CALLBACK_ERROR;
	}
	return null;
}

/**
 * Extract an actionable error message from an OAuth callback BroadcastChannel /
 * postMessage payload when present.
 */
export function getOAuthCallbackErrorMessage(data: unknown): string {
	if (isOAuthErrorPayload(data) && typeof data.message === 'string') {
		return data.message.trim();
	}
	return '';
}
