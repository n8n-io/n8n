import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { AUTH_LOGIN, CLOSE_SESSION } from '../queries';
import type { GqlResponse, IAuthProvider } from '../helpers/interfaces';

export async function createSession(
	this: IExecuteFunctions,
	serverUrl: string,
	authProvider: IAuthProvider,
): Promise<string> {
	const { provider, credentials } = authProvider.getPayload();

	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: `${serverUrl}/api/gql`,
		headers: { 'Content-Type': 'application/json' },
		body: {
			query: AUTH_LOGIN.query,
			operationName: AUTH_LOGIN.operationName,
			variables: { provider, credentials },
		},
		json: true,
		returnFullResponse: true,
	});

	const body = response.body as GqlResponse<{ authLogin?: { authStatus?: string } }>;
	const authStatus = body.data?.authLogin?.authStatus;
	if (authStatus !== 'SUCCESS') {
		throw new NodeOperationError(this.getNode(), 'CloudBeaver authentication failed');
	}

	const setCookie = response.headers['set-cookie'] as string | string[] | undefined;
	if (!setCookie) {
		throw new NodeOperationError(this.getNode(), 'No session cookie received from CloudBeaver');
	}

	const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
	const cookiePairs = cookies.map((c: string) => c.split(';')[0]);

	const sessionCookie = cookiePairs.find((c) => c.startsWith('cb-session-id='));
	if (!sessionCookie) {
		throw new NodeOperationError(this.getNode(), 'No cb-session-id received from CloudBeaver');
	}

	return sessionCookie;
}

export async function cloudbeaverRequest(
	this: IExecuteFunctions,
	serverUrl: string,
	body: { query: string; operationName?: string; variables?: Record<string, unknown> },
	sessionCookie: string,
): Promise<GqlResponse<unknown>> {
	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: `${serverUrl}/api/gql`,
		headers: {
			'Content-Type': 'application/json',
			Cookie: sessionCookie,
		},
		body,
		json: true,
	});
	return response as GqlResponse<unknown>;
}

export async function withSession<T>(
	ctx: IExecuteFunctions,
	serverUrl: string,
	authProvider: IAuthProvider,
	fn: (sessionCookie: string) => Promise<T>,
): Promise<T> {
	const sessionCookie = await createSession.call(ctx, serverUrl, authProvider);
	try {
		return await fn(sessionCookie);
	} finally {
		try {
			await cloudbeaverRequest.call(
				ctx,
				serverUrl,
				{ query: CLOSE_SESSION.query, operationName: CLOSE_SESSION.operationName },
				sessionCookie,
			);
		} catch {}
	}
}
