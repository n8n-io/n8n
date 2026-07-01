import {
	DnsResolver,
	InMemoryDnsCache,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { mockLogger } from '@n8n/backend-test-utils';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { IncomingHttpHeaders } from 'node:http';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2TokenIntrospectionIdentifier } from '../oauth2-introspection-identifier';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';

interface CapturedRequest {
	url: string;
	method: string;
	headers: IncomingHttpHeaders;
	body: string;
}

/**
 * Real-socket coverage for the metadata → introspection sequence. Drives the
 * actual `OutboundHttp` factory (no mocks) so we exercise the SSRF-guarded
 * client, the form-urlencoded request body, and JSON response parsing end to end.
 */
describe('OAuth2TokenIntrospectionIdentifier (integration)', () => {
	let server: LocalServer;
	let baseUrl = '';
	let received: CapturedRequest[];

	const mockContext = { identity: 'mock-access-token', version: 1 as const };

	const validOptions = () => ({
		metadataUri: `${baseUrl}/.well-known/oauth-authorization-server`,
		clientId: 'test-client',
		clientSecret: 'test-secret',
		subjectClaim: 'sub',
		validation: 'oauth2-introspection' as const,
	});

	const buildIdentifier = (configOverrides: Partial<SsrfProtectionConfig>) => {
		const config = new SsrfProtectionConfig();
		Object.assign(config, configOverrides);
		const ssrfService = new SsrfProtectionService(
			config,
			new DnsResolver(new InMemoryDnsCache(config)),
			mockLogger(),
		);
		const outboundHttp = new OutboundHttp(ssrfService, mockLogger());
		const cache = mock<CacheService>();
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
		const httpClient = new OAuth2MetadataHttpClient(
			mockLogger(),
			cache,
			outboundHttp,
			ssrfService,
			config,
		);
		return new OAuth2TokenIntrospectionIdentifier(mockLogger(), cache, httpClient);
	};

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
				if (req.url === '/introspect') {
					res.end(JSON.stringify({ active: true, sub: 'user-123' }));
				} else {
					// Discovery: the server itself dictates the second-hop endpoint.
					res.end(
						JSON.stringify({
							issuer: baseUrl,
							introspection_endpoint: `${baseUrl}/introspect`,
							introspection_endpoint_auth_methods_supported: ['client_secret_basic'],
						}),
					);
				}
			});
		});
		baseUrl = server.url;
	});

	afterEach(async () => {
		await server.close();
	});

	test('resolves the subject over a real socket through the SSRF-guarded client', async () => {
		// Loopback is blocked by default; an internal target is reached via the
		// allowlist (mirroring a self-hosted IdP), not by disabling the guard.
		const identifier = buildIdentifier({ enabled: true, allowedIpRanges: ['127.0.0.0/8'] });

		const subject = await identifier.resolve(mockContext, validOptions());

		expect(subject).toBe('user-123');
		expect(received).toHaveLength(2);

		const [metadataReq, introspectReq] = received;
		expect(metadataReq.method).toBe('GET');
		expect(metadataReq.url).toBe('/.well-known/oauth-authorization-server');

		expect(introspectReq.method).toBe('POST');
		expect(introspectReq.url).toBe('/introspect');
		expect(introspectReq.headers['content-type']).toBe('application/x-www-form-urlencoded');
		expect(introspectReq.headers.authorization).toMatch(/^Basic /);
		// Form-urlencoded body carries the caller token.
		expect(new URLSearchParams(introspectReq.body).get('token')).toBe('mock-access-token');
	});

	test('surfaces a blocked metadataUri as the normal "Could not reach metadata URL" path', async () => {
		// SSRF enabled, loopback NOT allowlisted → the metadata fetch is blocked.
		const identifier = buildIdentifier({ enabled: true });

		const error = await identifier.validateOptions(validOptions()).catch((e) => e);

		expect(error).toBeInstanceOf(IdentifierValidationError);
		expect(error.message).toContain('Could not reach metadata URL');
		expect(received).toHaveLength(0);
	});
});
