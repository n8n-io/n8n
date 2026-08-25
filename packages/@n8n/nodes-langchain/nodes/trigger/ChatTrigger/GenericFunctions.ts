import basicAuth from 'basic-auth';
import type { ICredentialDataDecryptedObject, IWebhookFunctions } from 'n8n-workflow';

import { verifyChatUserAuthToken } from './auth-token';
import { ChatTriggerAuthorizationError } from './error';
import { isChatOAuth2Enabled } from './shell';
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
			if (isChatOAuth2Enabled()) {
				const chatToken = headers['x-auth-token'];
				if (typeof chatToken === 'string' && chatToken) {
					if (verifyChatUserAuthToken(chatToken, context.getNode())) return;
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
