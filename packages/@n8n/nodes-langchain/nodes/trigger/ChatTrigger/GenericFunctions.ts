import basicAuth from 'basic-auth';
import { UnexpectedError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, IUser, IWebhookFunctions } from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from './error';
import {
	clearChatOAuthToken,
	isChatOAuth2Enabled,
	readChatOAuthToken,
	setChatOAuthToken,
} from './shell';
import type { AuthenticationChatOption } from './types';

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
 * On success, stashes the AS token in the one-hop `n8n-chat-oauth` cookie and
 * returns `true` — the caller renders the shell, whose frame's own GET picks
 * the cookie up via `resolveInnerFrameIdentity`. Returns `false` after
 * already sending a redirect/error response — the caller must abort with
 * `noWebhookResponse`.
 */
export async function establishChatSessionIdentity(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<boolean> {
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
		return false;
	}

	if (typeof code === 'string' && typeof state === 'string') {
		// Handle the AS callback. Stash the token in a one-hop cookie and redirect to
		// the clean shell URL — the follow-up GET (below) picks up the cookie and
		// renders the shell, whose frame then consumes it via `resolveInnerFrameIdentity`.
		try {
			const result = await context.completeN8nOAuth2Flow(code, state);
			if (result.valid) {
				setChatOAuthToken(res, req, resourceUrl, result.token);
				const redirectPath = req.originalUrl.split('?')[0];
				res.writeHead(302, { Location: redirectPath });
				res.end();
				return false;
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
		const cookieToken = readChatOAuthToken(req);
		if (cookieToken) {
			const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
			if (validation.valid) {
				return true;
			}
			// Stale/invalid cookie — fall through to restart the OAuth2 flow.
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
	return false;
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
): Promise<{ visitor: IUser; authToken: string } | null> {
	const req = context.getRequestObject();
	const res = context.getResponseObject();

	const cookieToken = readChatOAuthToken(req);
	if (!cookieToken) {
		return null;
	}
	clearChatOAuthToken(res, req, resourceUrl);

	const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
	if (!validation.valid) {
		return null;
	}
	return { visitor: validation.user, authToken: cookieToken };
}
