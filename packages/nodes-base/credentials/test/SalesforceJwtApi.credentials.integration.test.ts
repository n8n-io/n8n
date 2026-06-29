import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IHttpRequestHelper } from 'n8n-workflow';
import type { IncomingHttpHeaders } from 'node:http';

import { SalesforceJwtApi } from '../SalesforceJwtApi.credentials';

vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn(() => 'signed-jwt') },
}));
vi.mock('@n8n/utils', () => ({
	formatPemBlock: (key: string) => key,
}));

interface CapturedRequest {
	url: string;
	method: string;
	headers: IncomingHttpHeaders;
	body: string;
}

/**
 * Real-socket coverage for the Salesforce JWT-bearer token exchange. `myDomainUrl`
 * is a credential field, so we point it at the local server and drive the actual
 * SSRF-guarded `OutboundHttp` stack (loopback is reached via the allowlist, as a
 * self-hosted org would, rather than by disabling the guard).
 */
describe('SalesforceJwtApi Credential (integration)', () => {
	const credential = new SalesforceJwtApi();
	// `this.helpers` is unused now that the token POST goes through the shared HTTP client.
	const helpers = { helpers: {} } as unknown as IHttpRequestHelper;
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
				res.end(
					JSON.stringify({
						access_token: 'salesforce-access-token',
						instance_url: server.url,
					}),
				);
			});
		});

		const config = new SsrfProtectionConfig();
		Object.assign(config, { enabled: true, allowedIpRanges: ['127.0.0.0/8'] });
		Container.set(SsrfProtectionConfig, config);
	});

	afterEach(async () => {
		await server.close();
		Container.reset();
	});

	test('exchanges the JWT assertion for an access token over a real socket', async () => {
		const result = await credential.preAuthentication.call(helpers, {
			clientId: 'connected-app-client-id',
			username: 'user@example.com',
			privateKey: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
			environment: 'production',
			myDomainUrl: server.url,
		});

		expect(received).toHaveLength(1);
		const [tokenReq] = received;
		expect(tokenReq.method).toBe('POST');
		expect(tokenReq.url).toBe('/services/oauth2/token');
		expect(tokenReq.headers['content-type']).toBe('application/x-www-form-urlencoded');

		const body = new URLSearchParams(tokenReq.body);
		expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
		expect(body.get('assertion')).toBe('signed-jwt');

		expect(result).toEqual({
			accessToken: 'salesforce-access-token',
			instanceUrl: server.url,
		});
	});
});
