import {
	DnsResolver,
	InMemoryDnsCache,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import { startServer, type LocalServer } from '@n8n/backend-network/testing';
import { mockLogger } from '@n8n/backend-test-utils';
import { SsrfProtectionConfig } from '@n8n/config';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { JSONWebKeySet, JWTPayload, KeyObject } from 'jose';
import { mock } from 'vitest-mock-extended';
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

const AUDIENCE = 'n8n-client';

/**
 * Real-socket coverage for the metadata → JWKS → userinfo sequence. Drives the
 * actual `OutboundHttp` factory (no mocks) so we exercise the SSRF-guarded client,
 * request mapping, and JSON parsing end to end.
 */
describe('OAuth2UserInfoIdentifier (integration)', () => {
	let server: LocalServer;
	let baseUrl = '';
	let received: CapturedRequest[];

	let signingKey: KeyObject;
	let jwks: JSONWebKeySet;

	const mockContext = { identity: 'mock-access-token', version: 1 as const };

	beforeAll(async () => {
		const keyPair = await generateKeyPair('RS256');
		signingKey = keyPair.privateKey;
		jwks = { keys: [{ ...(await exportJWK(keyPair.publicKey)), kid: 'test-key', alg: 'RS256' }] };
	});

	const signToken = async (claims: JWTPayload) =>
		await new SignJWT(claims)
			.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
			.setIssuer(baseUrl)
			.setIssuedAt()
			.setExpirationTime('1h')
			.sign(signingKey);

	const buildIdentifier = (configOverrides: Partial<SsrfProtectionConfig>) => {
		const config = new SsrfProtectionConfig();
		Object.assign(config, configOverrides);
		const ssrfService = new SsrfProtectionService(
			config,
			new DnsResolver(new InMemoryDnsCache(config)),
			mockLogger(),
		);
		const outboundHttp = new OutboundHttp(ssrfService, config, mockLogger());
		const cache = mock<CacheService>();
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
		const httpClient = new OAuth2MetadataHttpClient(mockLogger(), cache, outboundHttp);
		return new OAuth2UserInfoIdentifier(mockLogger(), cache, httpClient);
	};

	beforeEach(async () => {
		received = [];
		server = await startServer((req, res) => {
			received.push({ url: req.url ?? '', method: req.method ?? '', headers: req.headers });
			res.writeHead(200, { 'content-type': 'application/json' });
			if (req.url === '/userinfo') {
				res.end(JSON.stringify({ sub: 'user-123', email: 'user@example.com' }));
			} else if (req.url === '/jwks') {
				res.end(JSON.stringify(jwks));
			} else {
				// Discovery: the server itself dictates the second-hop endpoints.
				res.end(
					JSON.stringify({
						issuer: baseUrl,
						userinfo_endpoint: `${baseUrl}/userinfo`,
						jwks_uri: `${baseUrl}/jwks`,
					}),
				);
			}
		});
		baseUrl = server.url;
	});

	afterEach(async () => {
		await server.close();
	});

	// Loopback is blocked by default; an internal target is reached via the
	// allowlist (mirroring a self-hosted IdP), not by disabling the guard.
	const allowLoopback = { enabled: true, allowedIpRanges: ['127.0.0.0/8'] };

	const boundOptions = () => ({
		metadataUri: `${baseUrl}/.well-known/openid-configuration`,
		subjectClaim: 'sub',
		validation: 'oauth2-userinfo',
		expectedAudience: AUDIENCE,
	});

	test('resolves the subject from a verified token over a real socket', async () => {
		const identifier = buildIdentifier(allowLoopback);
		const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

		const subject = await identifier.resolve({ ...mockContext, identity: token }, boundOptions());

		expect(subject).toBe('user-123');

		// Discovery then JWKS, both through the guarded client. UserInfo is not needed
		// because the verified token already carries the configured claim.
		expect(received.map((r) => r.url)).toEqual(['/.well-known/openid-configuration', '/jwks']);
		expect(received[0].headers.accept).toContain('application/json');
	});

	test('rejects a token issued for a different party', async () => {
		const identifier = buildIdentifier(allowLoopback);
		const token = await signToken({ sub: 'user-123', aud: 'other-app' });

		await expect(
			identifier.resolve({ ...mockContext, identity: token }, boundOptions()),
		).rejects.toThrow('Token was not issued for the expected audience');
	});

	test('queries UserInfo when the configured claim is absent from the token', async () => {
		const identifier = buildIdentifier(allowLoopback);
		const token = await signToken({ sub: 'user-123', aud: AUDIENCE });

		const subject = await identifier.resolve(
			{ ...mockContext, identity: token },
			{
				...boundOptions(),
				subjectClaim: 'email',
			},
		);

		expect(subject).toBe('user@example.com');

		const userInfoReq = received.find((r) => r.url === '/userinfo');
		expect(userInfoReq?.method).toBe('GET');
		expect(userInfoReq?.headers.authorization).toBe(`Bearer ${token}`);
	});

	test('still resolves a resolver stored without an expected audience', async () => {
		const identifier = buildIdentifier(allowLoopback);

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

		expect(userInfoReq.method).toBe('GET');
		expect(userInfoReq.url).toBe('/userinfo');
		expect(userInfoReq.headers.authorization).toBe('Bearer mock-access-token');
	});

	test('surfaces a blocked metadataUri as the normal "Could not reach metadata URL" path', async () => {
		// SSRF enabled, loopback NOT allowlisted → the metadata fetch is blocked.
		const identifier = buildIdentifier({ enabled: true });

		const error = await identifier.validateOptions(boundOptions()).catch((e) => e);

		expect(error).toBeInstanceOf(IdentifierValidationError);
		expect(error.message).toContain('Could not reach metadata URL');
		// The request never left the process.
		expect(received).toHaveLength(0);
	});
});
