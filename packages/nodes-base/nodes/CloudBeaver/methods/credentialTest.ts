import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import { createAuthProvider } from '../transport/auth/createAuthProvider';
import { AUTH_LOGIN, CLOSE_SESSION } from '../queries';
import type { GqlResponse } from '../helpers/interfaces';

export async function cloudBeaverApiTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const raw = credential.data ?? {};
	const data = {
		serverUrl: String(raw.serverUrl ?? ''),
		authType: String(raw.authType ?? ''),
		token: String(raw.token ?? ''),
		user: String(raw.user ?? ''),
		password: String(raw.password ?? ''),
	};
	const url = `${data.serverUrl.replace(/\/$/, '')}/api/gql`;

	try {
		const authProvider = createAuthProvider(data);
		const { provider, credentials: authCredentials } = authProvider.getPayload();

		const loginResponse = await this.helpers.request({
			method: 'POST',
			uri: url,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: AUTH_LOGIN.query,
				operationName: AUTH_LOGIN.operationName,
				variables: { provider, credentials: authCredentials },
			}),
			json: true,
			resolveWithFullResponse: true,
		});

		const body = loginResponse.body as GqlResponse<{ authLogin?: { authStatus?: string } }>;
		const authStatus = body.data?.authLogin?.authStatus;

		if (authStatus !== 'SUCCESS') {
			return { status: 'Error', message: 'Authentication failed' };
		}

		const setCookie = loginResponse.headers?.['set-cookie'] as string | string[] | undefined;
		const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
		const sessionCookie = cookies
			.map((c: string) => c.split(';')[0])
			.find((c) => c.startsWith('cb-session-id='));

		if (sessionCookie) {
			try {
				await this.helpers.request({
					method: 'POST',
					uri: url,
					headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
					body: JSON.stringify({
						query: CLOSE_SESSION.query,
						operationName: CLOSE_SESSION.operationName,
					}),
					json: true,
				});
			} catch {}
		}

		return { status: 'OK', message: 'Connection successful' };
	} catch (error) {
		return { status: 'Error', message: (error as Error).message };
	}
}
