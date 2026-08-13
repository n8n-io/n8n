import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';

export const OAUTH_CALLBACK_SUCCESS = 'success';
export const OAUTH_CALLBACK_ERROR = 'error';

export type OAuthCallbackResult = typeof OAUTH_CALLBACK_SUCCESS | typeof OAUTH_CALLBACK_ERROR;

export type OAuthFlowOutcome = OAuthCallbackResult | 'aborted' | 'timeout';

/** How long to wait for an OAuth flow to deliver a result before giving up. */
export const OAUTH_FLOW_TIMEOUT = 5 * 60 * 1000;

const POPUP_CLOSED_POLL_INTERVAL = 500;
const VERIFY_CONNECTED_INTERVAL = 2000;

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

/**
 * Validate an incoming `window` `message` event and return the OAuth result it
 * carries, or `null` when the event should be ignored (untrusted origin or an
 * unrelated payload).
 */
export function parseOAuthCallbackMessage(
	event: MessageEvent,
	trustedOrigins: string[],
): OAuthCallbackResult | null {
	if (!trustedOrigins.includes(event.origin)) return null;
	if (event.data === OAUTH_CALLBACK_SUCCESS) return OAUTH_CALLBACK_SUCCESS;
	if (event.data === OAUTH_CALLBACK_ERROR) return OAUTH_CALLBACK_ERROR;
	return null;
}

/**
 * Whether credential data contains OAuth token data, i.e. an OAuth flow has
 * completed for the credential. The backend never exposes the token itself;
 * its presence is signalled by a redacted placeholder value.
 */
export function isOAuthTokenDataSet(data: unknown): boolean {
	if (typeof data !== 'object' || data === null || !('oauthTokenData' in data)) return false;
	const { oauthTokenData } = data;
	return Boolean(oauthTokenData) && oauthTokenData !== CREDENTIAL_EMPTY_VALUE;
}

/** `isOAuthTokenDataSet` applied to a fetched credential's `data` field. */
export function hasOAuthTokenData(credential: unknown): boolean {
	if (typeof credential !== 'object' || credential === null || !('data' in credential)) {
		return false;
	}
	return isOAuthTokenDataSet(credential.data);
}

export interface WaitForOAuthCallbackOptions {
	popup: Window;
	trustedOrigins: string[];
	signal?: AbortSignal;
	/**
	 * Asks the backend whether the flow already completed for this credential.
	 * Only pass this for credentials that have no OAuth token data yet — an
	 * existing token would read as an immediate false success on reconnect.
	 */
	verifyConnected?: () => Promise<boolean>;
	timeoutMs?: number;
}

/**
 * Wait for an OAuth popup flow to finish and resolve with its outcome.
 *
 * A popup that reads as closed is NOT treated as failure: for providers that
 * respond with `Cross-Origin-Opener-Policy: same-origin` the browser severs
 * the opener relationship, after which `popup.closed` reads `true` while the
 * window is still open and the user is still authorizing. When the popup
 * reads as closed we instead start polling `verifyConnected` (when given) and
 * keep listening for callback messages until `timeoutMs` elapses or `signal`
 * aborts.
 */
export async function waitForOAuthCallback({
	popup,
	trustedOrigins,
	signal,
	verifyConnected,
	timeoutMs = OAUTH_FLOW_TIMEOUT,
}: WaitForOAuthCallbackOptions): Promise<OAuthFlowOutcome> {
	return await new Promise((resolve) => {
		const oauthChannel = new BroadcastChannel('oauth-callback');
		let settled = false;
		let verifyTimer: ReturnType<typeof setInterval> | undefined;
		let verifyInFlight = false;

		function settle(outcome: OAuthFlowOutcome) {
			if (settled) return;
			settled = true;
			oauthChannel.removeEventListener('message', onChannelMessage);
			oauthChannel.close();
			window.removeEventListener('message', onWindowMessage);
			signal?.removeEventListener('abort', onAbort);
			clearInterval(popupClosedPoll);
			if (verifyTimer !== undefined) clearInterval(verifyTimer);
			clearTimeout(timeoutTimer);
			resolve(outcome);
		}

		function onChannelMessage(event: MessageEvent) {
			settle(event.data === OAUTH_CALLBACK_SUCCESS ? OAUTH_CALLBACK_SUCCESS : OAUTH_CALLBACK_ERROR);
		}

		// Cross-origin embed fallback: the callback page also posts to the opener.
		function onWindowMessage(event: MessageEvent) {
			const result = parseOAuthCallbackMessage(event, trustedOrigins);
			if (result === null) return;
			settle(result);
		}

		function onAbort() {
			settle('aborted');
		}

		async function verify() {
			if (verifyInFlight || settled || !verifyConnected) return;
			verifyInFlight = true;
			try {
				if (await verifyConnected()) settle(OAUTH_CALLBACK_SUCCESS);
			} catch {
				// Treat verification errors as "not connected yet" and keep waiting.
			} finally {
				verifyInFlight = false;
			}
		}

		const popupClosedPoll = setInterval(() => {
			if (!popup.closed) return;
			clearInterval(popupClosedPoll);
			if (verifyConnected) {
				void verify();
				verifyTimer = setInterval(() => void verify(), VERIFY_CONNECTED_INTERVAL);
			}
		}, POPUP_CLOSED_POLL_INTERVAL);

		const timeoutTimer = setTimeout(() => settle('timeout'), timeoutMs);

		oauthChannel.addEventListener('message', onChannelMessage);
		window.addEventListener('message', onWindowMessage);
		signal?.addEventListener('abort', onAbort);
		if (signal?.aborted) onAbort();
	});
}
