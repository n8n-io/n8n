/**
 * An OAuth2 credential with an expired access token: n8n-core refreshes it on
 * the 401 and calls `updateCredentialsOauthTokenData`. The host has no store,
 * so it keeps the new token for the step and the request goes on.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { startTestHost, TestClient, type TestHost } from './test-client';

describe('a node step whose OAuth2 token has expired', () => {
	let host: TestHost;
	let client: TestClient;
	let api: Server;
	let base = '';
	const seen: string[] = [];

	beforeAll(async () => {
		host = await startTestHost();
		api = createServer((request, response) => {
			response.setHeader('content-type', 'application/json');
			if (request.url === '/token') {
				response.end(
					JSON.stringify({ access_token: 'new', token_type: 'Bearer', expires_in: 3600 }),
				);
				return;
			}
			const auth = String(request.headers.authorization);
			seen.push(auth);
			if (auth !== 'Bearer new') {
				response.statusCode = 401;
				response.end(JSON.stringify({ error: 'expired' }));
				return;
			}
			response.end(JSON.stringify({ ok: true }));
		});
		await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', resolve));
		base = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
		client = await TestClient.connect(host.socketPath);
	});

	afterAll(async () => {
		client.close();
		await new Promise((resolve) => api.close(resolve));
		await host.stop();
	});

	it('refreshes the token and sends the request again', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'o',
				kind: 'node',
				step: 'Call',
				key: 'k-o',
				args: {
					name: 'Call',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						url: `${base}/data`,
						authentication: 'genericCredentialType',
						genericAuthType: 'oAuth2Api',
						options: {},
					},
					credential: 'oauth',
					items: [{}],
				},
				credential: {
					type: 'oAuth2Api',
					data: {
						grantType: 'authorizationCode',
						authUrl: `${base}/auth`,
						accessTokenUrl: `${base}/token`,
						clientId: 'c',
						clientSecret: 's',
						authentication: 'body',
						oauthTokenData: { access_token: 'old', refresh_token: 'r', token_type: 'Bearer' },
					},
				},
			},
		]);
		expect(response).toEqual({ id: 'o', ok: true, result: [{ ok: true }] });
		expect(seen).toEqual(['Bearer old', 'Bearer new']);
	});
});
