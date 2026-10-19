import { Logger } from '@n8n/backend-common';
import { CacheService, type OAuthDiscoveryClient, UrlService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import type { User } from '@n8n/db';
import {
	AuthenticationPipeline,
	JwkSchema,
	LocalAuthorizationServer,
	trustedSourceConfigSchemaFor,
	type SurfaceId,
} from '@n8n/inbound-auth';
import { DataSource } from '@n8n/typeorm';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWTPayload } from 'jose';
import { Cipher } from 'n8n-core';
import { randomString } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { TrustedSourceEntity } from '@/modules/inbound-auth-core/database/entities/trusted-source.entity';
import { TrustedSourceDiscoveryService } from '@/modules/inbound-auth-core/trusted-source-discovery.service';
import { TrustedSourceDbStore } from '@/modules/inbound-auth-core/trusted-source.store';
import { McpServerApiKeyService } from '@/modules/mcp/mcp-api-key.service';
import { McpProtectedResource } from '@/modules/mcp/mcp-protected-resource';
import { McpService } from '@/modules/mcp/mcp.service';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';
import { OAuthTokenService } from '@/modules/oauth-server/oauth-token.service';
import { ScopedJwtStrategy } from '@/modules/token-exchange/services/scoped-jwt.strategy';
import { TOKEN_EXCHANGE_ISSUER } from '@/modules/token-exchange/token-exchange.types';
import { AuthStrategyRegistry } from '@n8n/backend-services/auth';
import { JwtService } from '@n8n/backend-services';
import { createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

/**
 * The instance MCP server on the trusted-source pipeline, nothing mocked but the network: the
 * pipeline, the admission and the identity service are the real ones.
 */
const testServer = setupTestServer({
	// Production order: the MCP middleware resolves the inbound-auth contracts when it is built.
	modules: ['inbound-auth-core', 'oauth-jwe', 'oauth-server', 'mcp'],
	endpointGroups: ['mcp', 'jwks'],
});

const MCP_ISSUER = 'https://idp-a.example';
const PUBLIC_API_ISSUER = 'https://idp-b.example';
const CLIENT_ID = 'external-client';

let member: User;
let mcpResource: string;
let metadataUrl: string;
let privateKey: CryptoKey;
let apiKey: string;

const now = () => Math.floor(Date.now() / 1000);

/** A token from an external IdP for `member`, linked by its verified email on first use. */
async function externalToken(issuer: string, claims: JWTPayload = {}) {
	const iat = now();
	return await new SignJWT({
		iss: issuer,
		sub: 'idp-alice',
		aud: mcpResource,
		email: member.email,
		email_verified: true,
		client_id: CLIENT_ID,
		scope: 'workflow:read',
		iat,
		exp: iat + 3600,
		...claims,
	})
		.setProtectedHeader({ alg: 'ES256', kid: 'k1', typ: 'at+jwt' })
		.sign(privateKey);
}

async function seedSource(issuer: string, surface: SurfaceId, keys: unknown[]) {
	const config = trustedSourceConfigSchemaFor('admin').parse({
		version: 1,
		authentication: { type: 'oauth2' },
		surfaces: { [surface]: {} },
	});
	const rows = Container.get(DataSource).getRepository(TrustedSourceEntity);
	await rows.save(
		rows.create({
			name: `${surface} source`,
			type: 'oauth2',
			issuer,
			managedBy: 'admin',
			status: 'healthy',
			lastError: null,
			lastCheckedAt: new Date(),
			configVersion: 1,
			config: await Container.get(Cipher).encryptV2(config),
			metadata: JSON.stringify({
				version: 1,
				documents: [
					{ kind: 'jwks', fetchedAt: new Date().toISOString(), url: `${issuer}/keys`, keys },
				],
			}),
			discoveryClaimToken: null,
			discoveryClaimedAt: null,
		}),
	);
}

/** An access token as the instance issues it: signed and recorded, so it stays active until revoked. */
async function internalToken() {
	const tokens = Container.get(OAuthTokenService);
	const scopes = ['workflow:read'];
	const pair = tokens.generateTokenPair(member.id, CLIENT_ID, mcpResource, scopes);
	await tokens.saveTokenPair(
		pair.accessToken,
		pair.refreshToken,
		CLIENT_ID,
		member.id,
		scopes,
		pair.audience,
	);
	return pair.accessToken;
}

const probe = async (token?: string) => {
	const request = testServer.restlessAgent.get('/mcp-server/http');
	return await (token === undefined ? request : request.set('Authorization', `Bearer ${token}`));
};

/** Every line the authentication edge wrote, from the pipeline, the admission or the middleware. */
const authLines = (logger: Logger) =>
	[...vi.mocked(logger.info).mock.calls, ...vi.mocked(logger.warn).mock.calls].filter(([message]) =>
		message.startsWith('Inbound authentication'),
	);

const spyOnLogger = () => {
	const logger = Container.get(Logger);
	vi.spyOn(logger, 'info');
	vi.spyOn(logger, 'warn');
	return logger;
};

beforeAll(async () => {
	await Container.get(CacheService).init();
	member = await createMember();
	const resource = Container.get(McpProtectedResource);
	mcpResource = resource.getResourceUrl();
	metadataUrl = resource.getProtectedResourceMetadataUrl();
	Container.get(AuthStrategyRegistry).register(Container.get(ScopedJwtStrategy));
	apiKey = (await Container.get(McpServerApiKeyService).createMcpServerApiKey(member)).apiKey;
	await Container.get(McpSettingsService).setEnabled(true);
	// The token rows of the local server need a registered client.
	await Container.get(OAuthClientRepository).save({
		id: CLIENT_ID,
		name: 'MCP pipeline tests',
		redirectUris: ['https://example.com/callback'],
		grantTypes: ['authorization_code'],
		tokenEndpointAuthMethod: 'none',
	});

	// The module seeded `n8n-internal` at init; discovery normally runs as a system task. Run it
	// once here, reading the local authorization server in process, never over HTTP.
	const offline = mock<OAuthDiscoveryClient>();
	const refused = new Error('discovery must not go over HTTP');
	offline.fetchOpenIdConfiguration.mockRejectedValue(refused);
	offline.fetchOAuth2ServerMetadata.mockRejectedValue(refused);
	offline.fetchJwks.mockRejectedValue(refused);
	await new TrustedSourceDiscoveryService(
		Container.get(Logger),
		Container.get(TrustedSourceDbStore),
		offline,
		Container.get(LocalAuthorizationServer),
	).refresh('n8n-internal');

	const pair = await generateKeyPair('ES256');
	privateKey = pair.privateKey;
	const jwk = JwkSchema.parse({
		...(await exportJWK(pair.publicKey)),
		kid: 'k1',
		alg: 'ES256',
		use: 'sig',
	});
	await seedSource(MCP_ISSUER, 'instance-mcp', [jwk]);
	await seedSource(PUBLIC_API_ISSUER, 'public-api', [jwk]);
	await Container.get(CacheService).reset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Instance MCP authentication through the trusted-source pipeline', () => {
	test('admits an access token from the instance itself', async () => {
		const response = await probe(await internalToken());

		// GET answers 405 once the caller is authenticated.
		expect(response.statusCode).toBe(405);
	});

	test('refuses an access token from the instance after it is revoked', async () => {
		const token = await internalToken();
		await Container.get(OAuthTokenService).revokeAllTokensForGrant(CLIENT_ID, member.id);

		const response = await probe(token);

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toMatch(/error_description="revoked"$/);
	});

	test('admits a token from a trusted source that accepts instance-mcp, as an OAuth caller', async () => {
		const token = await externalToken(MCP_ISSUER);
		expect((await probe(token)).statusCode).toBe(405);
		// Only what the middleware hands to the server matters here, so stop there.
		const mcpService = Container.get(McpService);
		vi.spyOn(mcpService, 'resolveFeatureFlags').mockResolvedValue(
			mockDeep<Awaited<ReturnType<McpService['resolveFeatureFlags']>>>(),
		);
		const getServer = vi
			.spyOn(mcpService, 'getServer')
			.mockRejectedValue(new Error('stop after authentication'));

		await testServer.restlessAgent
			.post('/mcp-server/http')
			.set('Authorization', `Bearer ${token}`)
			.set('Accept', 'application/json, text/event-stream')
			.send({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test-client', version: '1.0.0' },
				},
			});

		expect(getServer).toHaveBeenCalledWith(
			expect.objectContaining({ id: member.id }),
			expect.anything(),
			expect.anything(),
			{ caller: { authType: 'oauth', clientId: CLIENT_ID }, grantedScopes: ['workflow:read'] },
		);
	});

	test('refuses a source that does not accept instance-mcp, with a reason that differs from a bad token', async () => {
		const notAccepted = await probe(await externalToken(PUBLIC_API_ISSUER));
		const tampered = await probe(`${(await internalToken()).slice(0, -2)}xx`);

		expect(notAccepted.statusCode).toBe(401);
		expect(notAccepted.headers['www-authenticate']).toMatch(
			/error="invalid_token", error_description="source-not-accepted"$/,
		);
		expect(tampered.statusCode).toBe(401);
		expect(tampered.headers['www-authenticate']).toMatch(
			/error="invalid_token", error_description="signature-invalid"$/,
		);
	});

	test('keeps an MCP API key and a token-exchange JWT off the pipeline', async () => {
		const run = vi.spyOn(Container.get(AuthenticationPipeline), 'run');
		const scopedJwt = Container.get(JwtService).sign('tokenExchange', {
			iss: TOKEN_EXCHANGE_ISSUER,
			sub: member.id,
			iat: now(),
			exp: now() + 3600,
			jti: `jti-${randomString(8)}`,
		});

		expect((await probe(apiKey)).statusCode).toBe(405);
		expect((await probe(scopedJwt)).statusCode).toBe(405);
		expect(run).not.toHaveBeenCalled();
	});

	test('names the protected-resource metadata in every challenge', async () => {
		const responses = [
			await probe(),
			await probe('not-a-token'),
			await probe(await externalToken(PUBLIC_API_ISSUER)),
		];

		for (const response of responses) {
			expect(response.statusCode).toBe(401);
			expect(response.headers['www-authenticate']).toContain(`resource_metadata="${metadataUrl}"`);
		}
		// A request without a credential gets no error code (RFC 6750 §3.1).
		expect(responses[0].headers['www-authenticate']).not.toContain('error=');
	});

	test('lists the issuers of the sources that accept instance-mcp in the metadata', async () => {
		const metadata = await testServer.restlessAgent
			.get('/.well-known/oauth-protected-resource/mcp-server/http')
			.expect(200);

		expect(metadata.body.authorization_servers).toEqual(
			expect.arrayContaining([Container.get(UrlService).getInstanceBaseUrl(), MCP_ISSUER]),
		);
		expect(metadata.body.authorization_servers).not.toContain(PUBLIC_API_ISSUER);
	});

	test('writes one authentication line per outcome, with no token, external subject or email', async () => {
		const logger = spyOnLogger();
		const tokens = [
			undefined,
			await internalToken(),
			await externalToken(MCP_ISSUER),
			apiKey,
			await externalToken(PUBLIC_API_ISSUER),
		];

		for (const token of tokens) {
			vi.mocked(logger.info).mockClear();
			vi.mocked(logger.warn).mockClear();
			await probe(token);
			expect(authLines(logger)).toHaveLength(1);

			const logged = JSON.stringify(authLines(logger));
			if (token !== undefined) expect(logged).not.toContain(token);
			expect(logged).not.toContain('idp-alice');
			expect(logged).not.toContain(member.email);
		}
	});

	test('refuses a JWT without an issuer with unknown-issuer, in one line', async () => {
		const logger = spyOnLogger();
		const token = Container.get(JwtService).sign('mcpApiKey', { sub: member.id });

		const response = await probe(token);

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toMatch(/error_description="unknown-issuer"$/);
		expect(authLines(logger)).toHaveLength(1);
	});
});
