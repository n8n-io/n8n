import basicAuth from 'basic-auth';
import { UnexpectedError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from './error';
import {
	clearChatOAuthToken,
	isChatOAuth2Enabled,
	readChatOAuthToken,
	readChatRefreshToken,
	setChatOAuthToken,
	setChatRefreshToken,
} from './shell';
import type { AuthenticationChatOption, ChatFrameIdentity, ChatShellSession } from './types';

/** Absolute expiry for an access token the AS just minted, from the duration it reported. */
function expiryFrom(expiresIn: number): number {
	return Date.now() + expiresIn * 1000;
}

/**
 * Seconds left on an absolute expiry, on the server's own clock. Converting here rather
 * than in the page is the point: the page must never subtract its own `Date.now()` from
 * a timestamp this process produced.
 */
function secondsUntil(expiresAt: number): number {
	return Math.max(0, (expiresAt - Date.now()) / 1000);
}

export async function validateAuth(context: IWebhookFunctions) {
	const authentication = context.getNodeParameter(
		'authentication',
		'none',
	) as AuthenticationChatOption;
	const req = context.getRequestObject();
	const headers = context.getHeaderData();

	if (authentication === 'none') {
		return;
	} else if (authentication === 'basicAuth') {
		// Basic authorization is needed to call webhook
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await context.getCredentials<ICredentialDataDecryptedObject>('httpBasicAuth');
		} catch {}

		if (expectedAuth === undefined || !expectedAuth.user || !expectedAuth.password) {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'No authentication data defined on node!');
		}

		const providedAuth = basicAuth(req);
		// Authorization data is missing
		if (!providedAuth) throw new ChatTriggerAuthorizationError(401);

		if (providedAuth.name !== expectedAuth.user || providedAuth.pass !== expectedAuth.password) {
			// Provided authentication data is wrong
			throw new ChatTriggerAuthorizationError(403);
		}
	} else if (authentication === 'n8nUserAuth') {
		const webhookName = context.getWebhookName();

		if (webhookName !== 'setup') {
			function getCookie(name: string) {
				const value = `; ${headers.cookie}`;
				const parts = value.split(`; ${name}=`);

				if (parts.length === 2) {
					return parts.pop()?.split(';').shift();
				}
				return '';
			}

			// The sandboxed frame carries this instead of the session cookie, which an opaque
			// origin never sends. Checked first so the frame doesn't depend on that cookie.
			// Verified against n8n's internal AS (not just decoded) so the token also seeds
			// the run's identity for private-credential resolution.
			// Restricted to hostedChat: that's the only mode with a page to run the frame on,
			// so a token from it must never authenticate a webhook-mode call — e.g. a stale
			// token replayed after the node's mode was switched from hostedChat to webhook.
			const mode = context.getNodeParameter('mode', 'hostedChat') as 'hostedChat' | 'webhook';
			if (isChatOAuth2Enabled() && mode === 'hostedChat') {
				const chatToken = headers['x-auth-token'];
				if (typeof chatToken === 'string' && chatToken) {
					const resourceUrl = context.getWebhookResourceUrl('default');
					if (resourceUrl) {
						const validation = await context.validateN8nOAuth2Token(chatToken, resourceUrl);
						if (validation.valid) {
							await context.establishTriggerIdentity(chatToken, resourceUrl, validation.user.id);
							return;
						}
					}
					throw new ChatTriggerAuthorizationError(401, 'Invalid authentication token');
				}
			}

			const authCookie = getCookie('n8n-auth');
			if (!authCookie) {
				throw new ChatTriggerAuthorizationError(401, 'User not authenticated!');
			}

			try {
				await context.validateCookieAuth(authCookie);
			} catch {
				throw new ChatTriggerAuthorizationError(401, 'Invalid authentication token');
			}
		}
	}

	return;
}

/**
 * Runs the AS handshake — `beginN8nOAuth2Flow` → (AS redirect) →
 * `completeN8nOAuth2Flow` — on the trusted shell's own GET, i.e. a normal
 * top-level document with real cookies. Must never be called for the
 * sandboxed frame's request: that document has no origin, so it can't
 * receive the AS's session-cookie check, and any consent/sign-in page the AS
 * falls back to would then render editor-ui inside the opaque frame.
 *
 * On success, stashes the AS token in the one-hop `n8n-chat-oauth` cookie and the
 * grant's refresh token in the long-lived httpOnly `n8n-chat-oauth-refresh` cookie,
 * establishes the run's identity from the access token (so the outer GET can check
 * end-user-credential readiness for the connect panel), and returns the resolved
 * identity plus the access token's remaining life — the caller renders the shell
 * around it, whose frame's own GET picks the one-hop cookie up via
 * `resolveInnerFrameIdentity`. Returns `null` after already sending a redirect/error
 * response — the caller must abort with `noWebhookResponse`.
 *
 * The refresh token stays in its cookie and never reaches the caller, so it can't
 * reach a document either.
 */
export async function establishChatSessionIdentity(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<(ChatFrameIdentity & ChatShellSession) | null> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();
	const { code, state } = req.query;

	if (typeof req.query.error === 'string') {
		// The AS returned an error (e.g. the user denied consent). Restarting the flow
		// here would loop straight back to the same denial, so stop and report.
		context.logger.warn('Chat OAuth2 authorization was denied or failed', {
			error: req.query.error,
		});
		res.status(403).send('Access denied');
		res.end();
		return null;
	}

	if (typeof code === 'string' && typeof state === 'string') {
		// Handle the AS callback. Stash the token in a one-hop cookie and redirect to
		// the clean shell URL — the follow-up GET (below) picks up the cookie and
		// renders the shell, whose frame then consumes it via `resolveInnerFrameIdentity`.
		try {
			const result = await context.completeN8nOAuth2Flow(code, state);
			if (result.valid) {
				setChatOAuthToken(res, req, resourceUrl, {
					token: result.token,
					expiresAt: expiryFrom(result.expiresIn),
				});
				setChatRefreshToken(res, req, resourceUrl, result.refreshToken);
				const redirectPath = req.originalUrl.split('?')[0];
				res.writeHead(302, { Location: redirectPath });
				res.end();
				return null;
			}
			// Fall through to restart the OAuth2 flow if the callback is invalid.
			context.logger.warn('Chat OAuth2 flow failed, restarting', { reason: result.reason });
		} catch (error) {
			// Ignore errors and fall through to the redirect below.
			context.logger.warn('Chat OAuth2 flow failed, restarting', { error });
		}
	} else {
		// Not an AS callback. If we just completed the flow, the token rides in the
		// one-hop cookie set on the redirect above — leave it for the frame's own GET
		// to consume, just confirm it's still good before rendering the shell around it.
		const session = readChatOAuthToken(req);
		if (session) {
			const validation = await context.validateN8nOAuth2Token(session.token, resourceUrl);
			if (validation.valid) {
				await context.establishTriggerIdentity(session.token, resourceUrl, validation.user.id);
				return {
					visitor: validation.user,
					authToken: session.token,
					expiresIn: secondsUntil(session.expiresAt),
				};
			}
			// Stale/invalid cookie — fall through to restart the OAuth2 flow.
		} else {
			// A reload mid-conversation: the one-hop cookie is long gone, but the grant
			// is still live in the refresh cookie. Rotating is cheaper than a full
			// redirect round trip through the AS, and keeps the visitor on the page.
			const refreshed = await refreshChatSession(context, resourceUrl);
			if (refreshed) {
				// A refresh result names no user — the grant already fixes the subject — so
				// the fresh token is validated to recover the visitor the connect panel is
				// rendered for.
				const validation = await context.validateN8nOAuth2Token(refreshed.token, resourceUrl);
				if (validation.valid) {
					await context.establishTriggerIdentity(refreshed.token, resourceUrl, validation.user.id);
					return {
						visitor: validation.user,
						authToken: refreshed.token,
						expiresIn: refreshed.expiresIn,
					};
				}
			}
			// Refresh failed — fall through to restart the OAuth2 flow, which handles it.
		}
	}

	try {
		const authorizationUrl = await context.beginN8nOAuth2Flow(resourceUrl);
		res.writeHead(302, { Location: authorizationUrl });
		res.end();
	} catch (error) {
		// Can't build the authorization URL — nothing to redirect to, so abort.
		context.logger.warn('Chat OAuth2 flow failed', { error });
		throw new UnexpectedError('Chat OAuth2 flow failed');
	}
	return null;
}

/**
 * Rotate the grant behind the refresh cookie into a fresh pair and re-set both
 * cookies. Returns the fresh access token and its lifetime, or `null` when there is
 * no refresh cookie or the AS refuses it — the caller decides whether that means
 * restart the flow or answer 401.
 */
async function refreshChatSession(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<{ token: string; expiresIn: number } | null> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	const refreshToken = readChatRefreshToken(req);
	if (!refreshToken) return null;

	try {
		const result = await context.refreshN8nOAuth2Flow(refreshToken, resourceUrl);
		if (!result.valid) {
			context.logger.warn('Chat OAuth2 refresh rejected', { reason: result.reason });
			return null;
		}
		const expiresAt = expiryFrom(result.expiresIn);
		setChatOAuthToken(res, req, resourceUrl, { token: result.token, expiresAt });
		// Rotation invalidates the token we just sent, so the cookie must be replaced
		// in the same response or the next refresh presents a consumed one.
		setChatRefreshToken(res, req, resourceUrl, result.refreshToken);
		return { token: result.token, expiresIn: result.expiresIn };
	} catch (error) {
		context.logger.warn('Chat OAuth2 refresh failed', { error });
		return null;
	}
}

/**
 * The shell's own refresh leg: a same-origin GET on the `setup` path that mints a
 * fresh access token for the frame. Authenticates purely from the httpOnly refresh
 * cookie — the shell's script never holds the refresh token and can't forge this.
 *
 * Answers the request itself; the caller must abort with `noWebhookResponse`.
 */
export async function handleChatTokenRefresh(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<void> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	// `no-store` because the response body is a bearer token: a shared cache holding
	// it would hand one visitor's token to the next.
	res.setHeader('Cache-Control', 'no-store');

	if (!readChatRefreshToken(req)) {
		res.status(401).json({ error: 'invalid_grant' });
		res.end();
		return;
	}

	const refreshed = await refreshChatSession(context, resourceUrl);
	if (!refreshed) {
		// The cookie stays. A concurrent refresh on the same path — a second tab — wins
		// the AS's atomic rotation and has already written its rotated token here, so
		// clearing would erase a live grant and take the winner down with the loser. A
		// cookie the AS really has finished with self-heals instead: the next shell GET
		// fails its refresh, redirects through the AS, and the callback overwrites it.
		res.status(401).json({ error: 'invalid_grant' });
		res.end();
		return;
	}

	// Only the access token crosses the wire; the rotated refresh token stays in its
	// httpOnly cookie. `expiresIn` is a duration, so the page schedules off its own
	// clock and never has to agree with the server's.
	res.status(200).json({ token: refreshed.token, expiresIn: refreshed.expiresIn }).end();
}

/**
 * Resolves the visitor's identity for the sandboxed frame's own GET, purely by
 * reading the one-hop cookie the shell's `establishChatSessionIdentity` left
 * behind. Never runs the OAuth2 handshake itself — the frame's opaque origin
 * can't receive the AS's session-cookie check, so `beginN8nOAuth2Flow` here
 * would just redirect this document to a sign-in/consent page it can't render.
 *
 * Returns `null` when the cookie is missing or invalid; the caller should
 * fail the request rather than start a flow it can't complete.
 */
export async function resolveInnerFrameIdentity(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<ChatFrameIdentity | null> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	const session = readChatOAuthToken(req);
	if (!session) {
		return null;
	}
	// Only the one-hop cookie: the refresh cookie has to survive this render, since
	// every later refresh the shell asks for is authenticated by it.
	clearChatOAuthToken(res, req, resourceUrl);

	const validation = await context.validateN8nOAuth2Token(session.token, resourceUrl);
	if (!validation.valid) {
		return null;
	}
	return { visitor: validation.user, authToken: session.token };
}
