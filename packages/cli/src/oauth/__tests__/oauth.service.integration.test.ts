import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { type LocalServer, startServer } from '@n8n/backend-network/testing';
import type { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import type { CredentialsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';
import type { IncomingHttpHeaders } from 'node:http';

import type { AuthService } from '@/auth/auth.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import type { CredentialsHelper } from '@/credentials-helper';
import type { EventService } from '@/events/event.service';
import type { ExternalHooks } from '@/external-hooks';
import type { OAuthBrowserBindingService } from '@/oauth/oauth-browser-binding.service';
import type { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';
import { OauthService, type OAuth1CredentialData } from '@/oauth/oauth.service';
import type { CacheService } from '@/services/cache/cache.service';
import type { UrlService } from '@/services/url.service';

interface Received {
	method?: string;
	url?: string;
	headers: IncomingHttpHeaders;
	body: string;
}

/**
 * Builds an `OauthService` whose only real collaborator is `OutboundHttp`; every
 * other dependency is mocked. SSRF protection is enabled (the gate flag is on),
 * but the loopback target is permitted via the bridge, mirroring the allowlist
 * escape hatch rather than disabling the guard.
 */
function buildService() {
	const ssrf = mock<SsrfProtectionService>();
	ssrf.validateUrl.mockResolvedValue({ ok: true, result: undefined });
	ssrf.validateConnectionHost.mockReturnValue({ ok: true, result: undefined });

	return new OauthService(
		mock<Logger>(),
		mock<CredentialsHelper>(),
		mock<CredentialsRepository>(),
		mock<CredentialsFinderService>(),
		mock<UrlService>(),
		mock<GlobalConfig>(),
		mock<ExternalHooks>(),
		mock<Cipher>(),
		mock<DynamicCredentialsProxy>(),
		mock<AuthService>(),
		mock<OAuthJweServiceProxy>(),
		mock<OAuthBrowserBindingService>(),
		mock<EventService>(),
		mock<CacheService>(),
		new OutboundHttp(ssrf, mock<Logger>()),
		ssrf,
		mock<SsrfProtectionConfig>({ enabled: true }),
	);
}

/**
 * Confirms the OAuth1 access-token exchange is equivalent over a real socket once
 * routed through `OutboundHttp` (CAT-3373): the signed Authorization header and
 * the form-urlencoded body actually cross the wire, and the form-urlencoded
 * string response is parsed back into token data. SSRF protection stays ON; the
 * loopback target is permitted via the bridge, mirroring the allowlist escape
 * hatch rather than disabling the guard.
 */
describe('OauthService (real HTTP round-trip)', () => {
	let server: LocalServer;
	let received: Received[];

	beforeAll(async () => {
		server = await startServer((req, res) => {
			const chunks: Buffer[] = [];
			req.on('data', (chunk: Buffer) => chunks.push(chunk));
			req.on('end', () => {
				received.push({
					method: req.method,
					url: req.url,
					headers: req.headers,
					body: Buffer.concat(chunks).toString(),
				});
				res.setHeader('content-type', 'application/x-www-form-urlencoded');
				res.writeHead(200);
				res.end('oauth_token=access-token&oauth_token_secret=access-secret');
			});
		});
	});

	afterAll(async () => await server.close());

	beforeEach(() => {
		received = [];
		server.clear();
	});

	it('exchanges an OAuth1 request token for an access token over a real socket', async () => {
		const service = buildService();
		const oauthCredentials: OAuth1CredentialData = {
			consumerKey: 'consumer_key',
			consumerSecret: 'consumer_secret',
			requestTokenUrl: `${server.url}/request_token`,
			authUrl: `${server.url}/authorize`,
			accessTokenUrl: `${server.url}/access_token`,
			signatureMethod: 'HMAC-SHA1',
		};

		const result = await service.getOAuth1AccessToken(oauthCredentials, {
			oauthToken: 'request-token',
			oauthVerifier: 'verifier',
			oauthTokenSecret: 'request-secret',
		});

		expect(result).toEqual({
			oauth_token: 'access-token',
			oauth_token_secret: 'access-secret',
		});

		expect(received).toHaveLength(1);
		const [request] = received;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('/access_token');
		expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
		expect(request.headers.authorization).toMatch(/^OAuth /);
		expect(request.body).toBe('oauth_verifier=verifier');
	});
});

/**
 * Confirms the OAuth2 `.well-known` discovery GET is equivalent over a real socket
 * once routed through `OutboundHttp` (CAT-3373). This is the callsite with the
 * subtlest behavior, so it gets a wire-level check rather than a mock:
 *
 * - only a 200 is accepted: a non-200 response is treated as a miss and the loop
 *   falls through to the next candidate URL (the old `validateStatus === 200`);
 * - a 200 body is parsed from JSON back into the metadata object (`json: true`).
 *
 * SSRF protection stays ON; the loopback target is permitted via the bridge.
 */
describe('OauthService discovery (real HTTP round-trip)', () => {
	let server: LocalServer;
	let received: Received[];

	const PROTECTED_RESOURCE_METADATA = {
		authorization_servers: ['https://auth.example.com'],
		resource: 'https://api.example.com/mcp',
		scopes_supported: ['read', 'write'],
	};

	beforeAll(async () => {
		server = await startServer((req, res) => {
			received.push({ method: req.method, url: req.url, headers: req.headers, body: '' });
			// The path-specific candidate (tried first) 404s; the root candidate
			// returns the metadata. This exercises the non-200 skip + JSON parse over
			// the wire, in order.
			if (req.url === '/.well-known/oauth-protected-resource') {
				res.setHeader('content-type', 'application/json');
				res.writeHead(200);
				res.end(JSON.stringify(PROTECTED_RESOURCE_METADATA));
				return;
			}
			res.writeHead(404);
			res.end('not found');
		});
	});

	afterAll(async () => await server.close());

	beforeEach(() => {
		received = [];
		server.clear();
	});

	it('skips a non-200 candidate and parses the 200 JSON metadata over a real socket', async () => {
		const service = buildService();

		// `discoverProtectedResourceMetadata` is the real discovery callsite; reach
		// it directly so the test stays focused on the GET round-trip rather than the
		// full auth-URI flow.
		const metadata = await service['discoverProtectedResourceMetadata'](`${server.url}/mcp`);

		// The 200 body crossed the wire as a JSON string and was parsed back into the
		// metadata object (not a raw string), exactly as the old axios `get` did.
		expect(metadata).toEqual(PROTECTED_RESOURCE_METADATA);

		// Both candidates were requested in order: the path-specific 404 was skipped,
		// then the root 200 succeeded.
		expect(received).toHaveLength(2);
		expect(received[0]).toMatchObject({
			method: 'GET',
			url: '/.well-known/oauth-protected-resource/mcp',
		});
		expect(received[1]).toMatchObject({
			method: 'GET',
			url: '/.well-known/oauth-protected-resource',
		});
		// `json: true` sets the Accept header on every discovery GET.
		expect(received[1].headers.accept).toContain('application/json');
	});
});
