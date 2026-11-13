/**
 * Credentials in the request frame: n8n sends the decrypted credential with the
 * step, so it does not write a credentials file. The frame comes before the file.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { frameCredentialStore } from '../credentials';
import { parseRequest, ProtocolError } from '../protocol';
import { startTestHost, TestClient, type TestHost } from './test-client';

describe('parseRequest with credentials', () => {
	const frame = (extra: Record<string, unknown>) =>
		Buffer.from(JSON.stringify({ id: '1', kind: 'node', step: 's', key: 'k', args: {}, ...extra }));

	it('reads the credential and the credentials by slot', () => {
		const request = parseRequest(
			frame({
				credential: { type: 'httpHeaderAuth', data: { name: 'x', value: 'y' } },
				credentials: { other: { type: 'openAiApi', data: { apiKey: 'k' } } },
			}),
		);
		expect(request.credential).toEqual({ type: 'httpHeaderAuth', data: { name: 'x', value: 'y' } });
		expect(request.credentials?.other.data).toEqual({ apiKey: 'k' });
	});

	it('rejects a credential without type and data', () => {
		expect(() => parseRequest(frame({ credential: { data: {} } }))).toThrow(ProtocolError);
	});
});

describe('frameCredentialStore', () => {
	const file = { get: async (slot: string) => ({ from: `file:${slot}` }) };

	it('gives the frame credential first and the file after it', async () => {
		const store = frameCredentialStore(
			{
				credential: { data: { from: 'frame' } },
				credentials: { model: { data: { from: 'map' } } },
			},
			'main',
			file,
		);
		expect(await store.get('main')).toEqual({ from: 'frame' });
		expect(await store.get('model')).toEqual({ from: 'map' });
		expect(await store.get('other')).toEqual({ from: 'file:other' });
	});
});

describe('a node step signed with a frame credential', () => {
	let host: TestHost;
	let client: TestClient;
	let api: Server;
	let port = 0;
	const seen: Array<string | undefined> = [];

	beforeAll(async () => {
		host = await startTestHost();
		api = createServer((request, response) => {
			seen.push(request.headers['x-api-key']?.toString());
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ ok: true }));
		});
		await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', resolve));
		port = (api.address() as AddressInfo).port;
		client = await TestClient.connect(host.socketPath);
	});

	afterAll(async () => {
		client.close();
		await new Promise((resolve) => api.close(resolve));
		await host.stop();
	});

	it('sends the header of the credential; the credentials file is empty', async () => {
		const [response] = await client.sendBatch([
			{
				id: 'h',
				kind: 'node',
				step: 'Call API',
				key: 'k-h',
				args: {
					name: 'Call API',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {
						url: `http://127.0.0.1:${port}/data`,
						authentication: 'genericCredentialType',
						genericAuthType: 'httpHeaderAuth',
						options: {},
					},
					credential: 'apiKey',
					items: [{}],
				},
				credential: { type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: 'secret-1' } },
			},
		]);
		expect(response).toEqual({ id: 'h', ok: true, result: [{ ok: true }] });
		expect(seen).toEqual(['secret-1']);
	});
});
