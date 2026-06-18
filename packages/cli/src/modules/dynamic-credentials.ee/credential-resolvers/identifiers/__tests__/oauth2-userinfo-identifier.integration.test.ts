import {
	DnsResolver,
	InMemoryDnsCache,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { mockLogger } from '@n8n/backend-test-utils';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { IncomingHttpHeaders } from 'node:http';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';
import { OAuth2UserInfoIdentifier } from '../oauth2-userinfo-identifier';

interface CapturedRequest {
	url: string;
	method: string;
	headers: IncomingHttpHeaders;
}

/**
 * Real-socket coverage for the metadata → userinfo sequence. Drives the actual
 * `OutboundHttp` factory (no mocks) so we exercise the SSRF-guarded client,
 * request mapping, and JSON parsing end to end.
 */
describe('OAuth2UserInfoIdentifier (integration)', () => {
	let server: LocalServer;
	let baseUrl = '';
	let received: CapturedRequest[];

	const mockContext = { identity: 'mock-access-token', version: 1 as const };

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
		return new OAuth2UserInfoIdentifier(mockLogger(), cache, httpClient);
	};

	beforeEach(async () => {
		received = [];
		server = await startServer((req, res) => {
			received.push({ url: req.url ?? '', method: req.method ?? '', headers: req.headers });
			res.writeHead(200, { 'content-type': 'application/json' });
			if (req.url === '/userinfo') {
				res.end(JSON.stringify({ sub: 'user-123' }));
			} else {
				// Discovery: the server itself dictates the second-hop endpoint.
				res.end(JSON.stringify({ issuer: baseUrl, userinfo_endpoint: `${baseUrl}/userinfo` }));
			}
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

		const subject = await identifier.resolve(mockContext, {
			metadataUri: `${baseUrl}/.well-known/openid-configuration`,
			subjectClaim: 'sub',
			validation: 'oauth2-userinfo',
		});

		expect(subject).toBe('user-123');
		expect(received).toHaveLength(2);

		const [metadataReq, userInfoReq] = received;
		expect(metadataReq.method).toBe('GET');
		expect(metadataReq.url).toBe('/.well-known/openid-configuration');
		expect(metadataReq.headers.accept).toContain('application/json');

		expect(userInfoReq.method).toBe('GET');
		expect(userInfoReq.url).toBe('/userinfo');
		expect(userInfoReq.headers.authorization).toBe('Bearer mock-access-token');
	});

	test('surfaces a blocked metadataUri as the normal "Could not reach metadata URL" path', async () => {
		// SSRF enabled, loopback NOT allowlisted → the metadata fetch is blocked.
		const identifier = buildIdentifier({ enabled: true });

		const error = await identifier
			.validateOptions({
				metadataUri: `${baseUrl}/.well-known/openid-configuration`,
				subjectClaim: 'sub',
				validation: 'oauth2-userinfo',
			})
			.catch((e) => e);

		expect(error).toBeInstanceOf(IdentifierValidationError);
		expect(error.message).toContain('Could not reach metadata URL');
		// The request never left the process.
		expect(received).toHaveLength(0);
	});
});
