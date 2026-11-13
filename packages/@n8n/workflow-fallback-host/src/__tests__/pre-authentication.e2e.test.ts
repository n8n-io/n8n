/**
 * A credential type with `preAuthentication` (Metabase: a session token from
 * the user name and password): the host fetches the token before the request,
 * as n8n's credentials helper does when the expirable property is empty.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { startTestHost, TestClient, type TestHost } from './test-client';

describe('a node step with a pre-authenticated credential', () => {
	let host: TestHost;
	let client: TestClient;
	let api: Server;
	let base = '';
	const seen: string[] = [];

	beforeAll(async () => {
		host = await startTestHost();
		api = createServer((request, response) => {
			response.setHeader('content-type', 'application/json');
			if (request.method === 'POST' && request.url === '/api/session') {
				response.end(JSON.stringify({ id: 'session-1' }));
				return;
			}
			seen.push(String(request.headers['x-metabase-session']));
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

	it('gets the session token and signs the request with it', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'm',
				kind: 'node',
				step: 'Call',
				key: 'k-m',
				args: {
					name: 'Call',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						url: `${base}/api/data`,
						authentication: 'predefinedCredentialType',
						nodeCredentialType: 'metabaseApi',
						options: {},
					},
					credential: 'metabase',
					items: [{}],
				},
				credential: {
					type: 'metabaseApi',
					data: { url: base, username: 'u', password: 'p', sessionToken: '' },
				},
			},
		]);
		expect(response).toEqual({ id: 'm', ok: true, result: [{ ok: true }] });
		expect(seen).toEqual(['session-1']);
	});
});
