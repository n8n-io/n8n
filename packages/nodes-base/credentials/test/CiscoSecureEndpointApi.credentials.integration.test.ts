import {
	OutboundHttp,
	type HttpRequestClient,
	type HttpRequestClientOptions,
} from '@n8n/backend-network';
import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { IncomingHttpHeaders } from 'node:http';

import { CiscoSecureEndpointApi } from '../CiscoSecureEndpointApi.credentials';

interface CapturedRequest {
	url: string;
	method: string;
	headers: IncomingHttpHeaders;
	body: string;
}

/**
 * Rewrites the credential's fixed vendor host to the local test server so the
 * real SSRF-guarded `OutboundHttp` stack is exercised over an actual socket;
 * only the destination host is swapped (loopback is reached via the allowlist).
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
 * Real-socket coverage for the Cisco Secure Endpoint two-hop token exchange.
 * Drives the actual SSRF-guarded `OutboundHttp` factory to confirm both migrated
 * POSTs map equivalently end to end and the first token feeds the second hop.
 */
describe('CiscoSecureEndpointApi Credential (integration)', () => {
	const credential = new CiscoSecureEndpointApi();
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
				if (req.url === '/iroh/oauth2/token') {
					res.end(JSON.stringify({ access_token: 'secure-x-token' }));
				} else {
					res.end(JSON.stringify({ access_token: 'secure-endpoint-token' }));
				}
			});
		});

		const config = new SsrfProtectionConfig();
		Object.assign(config, { enabled: true, allowedIpRanges: ['127.0.0.0/8'] });
		Container.set(SsrfProtectionConfig, config);
		Container.set(OutboundHttp, rewriteToLocalServer(Container.get(OutboundHttp), server));
	});

	afterEach(async () => {
		await server.close();
		Container.reset();
	});

	test('chains both token POSTs over a real socket and injects the final token', async () => {
		const result = await credential.authenticate(
			{ region: 'eu.amp', clientId: 'client-id', clientSecret: 'client-secret' },
			{ headers: {}, method: 'GET', url: 'https://api.eu.amp.cisco.com/v3/organizations' },
		);

		expect(received).toHaveLength(2);

		const [secureXReq, secureEndpointReq] = received;
		expect(secureXReq.method).toBe('POST');
		expect(secureXReq.url).toBe('/iroh/oauth2/token');
		expect(secureXReq.headers['content-type']).toBe('application/x-www-form-urlencoded');
		expect(secureXReq.headers.authorization).toMatch(/^Basic /);
		expect(new URLSearchParams(secureXReq.body).get('grant_type')).toBe('client_credentials');

		expect(secureEndpointReq.method).toBe('POST');
		expect(secureEndpointReq.url).toBe('/v3/access_tokens');
		// Second hop carries the first hop's token.
		expect(secureEndpointReq.headers.authorization).toBe('Bearer secure-x-token');
		expect(new URLSearchParams(secureEndpointReq.body).get('grant_type')).toBe(
			'client_credentials',
		);

		expect(result.headers?.Authorization).toBe('Bearer secure-endpoint-token');
	});
});
