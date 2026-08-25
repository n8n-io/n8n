import basicAuth from 'basic-auth';
import { UnexpectedError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, IUser, IWebhookFunctions } from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from './error';
import {
	CHAT_SHELL_INNER_PARAM,
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
			if (isChatOAuth2Enabled()) {
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
 * Resolves the visitor's identity for the sandboxed frame's own GET, via n8n's
 * internal AS rather than the session cookie the frame's opaque origin can't
 * send: `beginN8nOAuth2Flow` → (AS redirect) → `completeN8nOAuth2Flow`. A
 * one-hop cookie carries the token across that last redirect so `code`/`state`
 * never reach the author-shaped chat widget.
 *
 * Returns the resolved visitor and the token to embed in the page. Returns
 * `null` after already sending a redirect/error response — the caller must
 * abort with `noWebhookResponse`.
 */
export async function establishChatWidgetIdentity(
	context: IWebhookFunctions,
	resourceUrl: string,
): Promise<{ visitor: IUser; authToken: string } | null> {
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
		// Handle the AS callback. Don't render the frame here: this URL still carries
		// `code`/`state`, which must never reach the author-shaped chat widget. Stash the
		// token in a one-hop cookie and redirect to the clean inner-frame URL — the
		// follow-up GET (below) picks up the cookie and renders the frame.
		try {
			const result = await context.completeN8nOAuth2Flow(code, state);
			if (result.valid) {
				setChatOAuthToken(res, req, resourceUrl, result.token);
				const redirectPath = req.originalUrl.split('?')[0];
				res.writeHead(302, { Location: `${redirectPath}?${CHAT_SHELL_INNER_PARAM}=1` });
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
		// one-hop cookie set on the redirect above. Consume it once and render.
		const cookieToken = readChatOAuthToken(req);
		if (cookieToken) {
			clearChatOAuthToken(res, req, resourceUrl);
			const validation = await context.validateN8nOAuth2Token(cookieToken, resourceUrl);
			if (validation.valid) {
				return { visitor: validation.user, authToken: cookieToken };
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
	return null;
}
