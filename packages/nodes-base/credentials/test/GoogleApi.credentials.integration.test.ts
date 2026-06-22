import {
	OutboundHttp,
	type HttpRequestClient,
	type HttpRequestClientOptions,
} from '@n8n/backend-network';
import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { Container } from '@n8n/di';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { IncomingHttpHeaders } from 'node:http';

import { GoogleApi } from '../GoogleApi.credentials';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn(() => 'signed-jwt') },
}));

interface CapturedRequest {
	url: string;
	method: string;
	headers: IncomingHttpHeaders;
	body: string;
}

/**
 * Rewrites the credential's fixed vendor host to the local test server so the
 * real `OutboundHttp` stack (form-urlencoded body, headers, JSON parsing) is
 * exercised over an actual socket; only the destination host is swapped.
 */
function rewriteToLocalServer(realOutbound: OutboundHttp, server: LocalServer): OutboundHttp {
	return {
		requests: (options?: HttpRequestClientOptions) => {
			const client = realOutbound.requests(options);
			const request = (async (reqOptions: IHttpRequestOptions) => {
				const target = new URL(reqOptions.url);
				return await client.request({
					...reqOptions,
					url: `${server.url}${target.pathname}${target.search}`,
				});
			}) as HttpRequestClient['request'];
			return { ...client, request };
		},
		transport: realOutbound.transport.bind(realOutbound),
	} as unknown as OutboundHttp;
}

/**
 * Real-socket coverage for the Google service-account token exchange. Drives the
 * actual `OutboundHttp` factory (no mocks) to confirm the migrated request maps
 * equivalently end to end.
 */
describe('GoogleApi Credential (integration)', () => {
	const credential = new GoogleApi();
	let server: LocalServer;
	let received: CapturedRequest[];

	beforeEach(async () => {
		received = [];
		server = await startServer((req, res) => {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				received.push({
					url: req.url ?? '',
					method: req.method ?? '',
					headers: req.headers,
					body,
				});
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ access_token: 'google-access-token' }));
			});
		});

		Container.set(OutboundHttp, rewriteToLocalServer(Container.get(OutboundHttp), server));
	});

	afterEach(async () => {
		await server.close();
		Container.reset();
	});

	test('exchanges the JWT assertion for an access token over a real socket', async () => {
		const result = await credential.authenticate(
			{
				httpNode: true,
				email: 'svc@project.iam.gserviceaccount.com',
				privateKey: 'private-key',
				scopes: 'https://www.googleapis.com/auth/drive',
			},
			{ headers: {}, method: 'GET', url: 'https://www.googleapis.com/drive/v3/files' },
		);

		expect(received).toHaveLength(1);
		const [tokenReq] = received;
		expect(tokenReq.method).toBe('POST');
		expect(tokenReq.url).toBe('/token');
		expect(tokenReq.headers['content-type']).toBe('application/x-www-form-urlencoded');

		const body = new URLSearchParams(tokenReq.body);
		expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
		expect(body.get('assertion')).toBe('signed-jwt');

		expect(result.headers?.Authorization).toBe('Bearer google-access-token');
	});
});
