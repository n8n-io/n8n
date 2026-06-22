import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { SUPPORTED_SCOPES } from '@/modules/mcp/mcp-protected-resource';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

import { OAuthServerConfig } from '../oauth-server.config';
import type { OAuthController as OAuthControllerClass } from '../oauth.controller';

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

let owner: User;
let mcpSettingsService: McpSettingsService;

beforeAll(async () => {
	owner = await createOwner();
	mcpSettingsService = Container.get(McpSettingsService);
});

afterEach(async () => {
	await testDb.truncate(['OAuthClient', 'AuthorizationCode', 'AccessToken', 'RefreshToken']);
});

describe('GET /.well-known/oauth-authorization-server', () => {
	test('should return OAuth authorization server metadata', async () => {
		const response = await testServer.restlessAgent.get('/.well-known/oauth-authorization-server');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			issuer: expect.any(String),
			authorization_endpoint: expect.stringContaining('/mcp-oauth/authorize'),
			token_endpoint: expect.stringContaining('/mcp-oauth/token'),
			registration_endpoint: expect.stringContaining('/mcp-oauth/register'),
			revocation_endpoint: expect.stringContaining('/mcp-oauth/revoke'),
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
			code_challenge_methods_supported: ['S256'],
			scopes_supported: SUPPORTED_SCOPES,
		});
	});

	test('should return metadata with correct base URL', async () => {
		const response = await testServer.restlessAgent.get('/.well-known/oauth-authorization-server');

		expect(response.statusCode).toBe(200);

		const {
			issuer,
			authorization_endpoint,
			token_endpoint,
			registration_endpoint,
			revocation_endpoint,
		} = response.body;

		expect(issuer).toMatch(/^https?:\/\//);
		expect(authorization_endpoint).toBe(`${issuer}/mcp-oauth/authorize`);
		expect(token_endpoint).toBe(`${issuer}/mcp-oauth/token`);
		expect(registration_endpoint).toBe(`${issuer}/mcp-oauth/register`);
		expect(revocation_endpoint).toBe(`${issuer}/mcp-oauth/revoke`);
	});

	test('should include all required OAuth 2.1 fields', async () => {
		const response = await testServer.restlessAgent.get('/.well-known/oauth-authorization-server');

		expect(response.statusCode).toBe(200);

		const metadata = response.body;

		expect(metadata.issuer).toBeDefined();
		expect(metadata.authorization_endpoint).toBeDefined();
		expect(metadata.token_endpoint).toBeDefined();
		expect(metadata.response_types_supported).toBeDefined();
		expect(metadata.grant_types_supported).toBeDefined();
		expect(metadata.code_challenge_methods_supported).toContain('S256');
	});

	test('should be accessible without authentication', async () => {
		const response = await testServer.restlessAgent.get('/.well-known/oauth-authorization-server');

		expect(response.statusCode).toBe(200);
	});
});

describe('GET /.well-known/oauth-protected-resource/mcp-server/http', () => {
	test('should return protected resource metadata', async () => {
		const response = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			resource: expect.stringContaining('/mcp-server/http'),
			bearer_methods_supported: ['header'],
			authorization_servers: [expect.any(String)],
			scopes_supported: SUPPORTED_SCOPES,
		});
	});

	test('should return metadata with correct resource URL', async () => {
		const response = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(response.statusCode).toBe(200);

		const { resource, authorization_servers } = response.body;

		expect(resource).toMatch(/^https?:\/\//);
		expect(resource).toContain('/mcp-server/http');
		expect(authorization_servers).toHaveLength(1);
		expect(authorization_servers[0]).toMatch(/^https?:\/\//);
	});

	test('should indicate Bearer token authentication via header', async () => {
		const response = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(response.statusCode).toBe(200);
		expect(response.body.bearer_methods_supported).toEqual(['header']);
	});

	test('should list supported scopes', async () => {
		const response = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(response.statusCode).toBe(200);
		expect(response.body.scopes_supported).toEqual(SUPPORTED_SCOPES);
		expect(response.body.scopes_supported.length).toBeGreaterThan(0);
	});

	test('should be accessible without authentication', async () => {
		const response = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(response.statusCode).toBe(200);
	});
});

describe('POST /mcp-oauth/register', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should register a new OAuth client with dynamic registration', async () => {
		const clientData = {
			client_name: 'Test MCP Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_method: 'none',
		};

		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);

		expect(response.statusCode).toBe(201);
		expect(response.body.client_id).toBeDefined();
		expect(response.body.client_name).toBe('Test MCP Client');
		expect(response.body.redirect_uris).toEqual(['https://example.com/callback']);
		expect(response.body.grant_types).toEqual(['authorization_code', 'refresh_token']);
		expect(response.body.token_endpoint_auth_method).toBe('none');
	});

	test('should generate unique client IDs for each registration', async () => {
		const clientData = {
			client_name: 'Test Client 1',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		};

		const response1 = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);
		const response2 = await testServer.restlessAgent
			.post('/mcp-oauth/register')
			.send({ ...clientData, client_name: 'Test Client 2' });

		expect(response1.statusCode).toBe(201);
		expect(response2.statusCode).toBe(201);
		expect(response1.body.client_id).toBeDefined();
		expect(response2.body.client_id).toBeDefined();
		expect(response1.body.client_id).not.toBe(response2.body.client_id);
	});

	test('should accept client registration without authentication', async () => {
		const clientData = {
			client_name: 'Public Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		};

		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);

		expect(response.statusCode).toBe(201);
	});

	test('should validate required fields in client registration', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
	});

	test('should reject registration when client_name is missing', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
	});

	test('should reject registration when grant_types is missing', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'Test Client',
			redirect_uris: ['https://example.com/callback'],
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
	});

	test('should reject registration when redirect_uris is missing', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'Test Client',
			grant_types: ['authorization_code'],
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
	});

	test('should register a client even when MCP access is disabled', async () => {
		// The shared OAuth server is decoupled from the instance MCP toggle, so
		// DCR stays available for other OAuth-protected resources (IAM-798).
		await mcpSettingsService.setEnabled(false);

		const clientData = {
			client_name: 'Test Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		};

		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);

		expect(response.statusCode).toBe(201);
		expect(response.body.client_id).toBeDefined();
	});

	test('should reject registration with too many redirect URIs', async () => {
		const clientData = {
			client_name: 'Test Client',
			redirect_uris: Array.from({ length: 11 }, (_, i) => `https://example${i}.com/callback`),
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		};

		const response = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
	});

	test('should reject with 503 server_error when instance client limit is reached (pre-check)', async () => {
		const globalConfig = Container.get(GlobalConfig);
		const originalLimit = globalConfig.endpoints.mcpMaxRegisteredClients;
		globalConfig.endpoints.mcpMaxRegisteredClients = 1;

		try {
			const clientData = {
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
			};

			const first = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);
			expect(first.statusCode).toBe(201);

			const second = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);
			expect(second.statusCode).toBe(503);
			expect(second.body).toMatchObject({
				error: 'server_error',
				error_description: expect.stringContaining('maximum of 1 registered MCP clients'),
			});
		} finally {
			globalConfig.endpoints.mcpMaxRegisteredClients = originalLimit;
		}
	});

	test('should reject with descriptive server_error on the post-insert rollback (race path)', async () => {
		const { OAuthServerService } = await import('../oauth-server.service');
		const globalConfig = Container.get(GlobalConfig);
		const originalLimit = globalConfig.endpoints.mcpMaxRegisteredClients;
		globalConfig.endpoints.mcpMaxRegisteredClients = 1;

		// Stub the pre-check guard to always pass, simulating two concurrent
		// registrations that both saw count < limit and made it past the guard.
		const guardSpy = jest
			.spyOn(OAuthServerService.prototype, 'isClientLimitReached')
			.mockResolvedValue(false);

		try {
			const clientData = {
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
			};

			const first = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);
			expect(first.statusCode).toBe(201);

			// Now count = 1, limit = 1. The guard is stubbed to pass; the
			// post-insert check sees count = 2 > 1 and throws.
			const second = await testServer.restlessAgent.post('/mcp-oauth/register').send(clientData);
			expect(second.statusCode).toBe(500);
			expect(second.body).toMatchObject({
				error: 'server_error',
				error_description: expect.stringContaining('maximum of 1 registered MCP clients'),
			});
		} finally {
			guardSpy.mockRestore();
			globalConfig.endpoints.mcpMaxRegisteredClients = originalLimit;
		}
	});
});

describe('GET /mcp-oauth/authorize', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should require authentication for authorization endpoint', async () => {
		const response = await testServer.restlessAgent.get('/mcp-oauth/authorize').query({
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: 'challenge',
			code_challenge_method: 'S256',
		});

		expect([302, 400, 401, 403]).toContain(response.statusCode);
	});

	test('should accept valid authorization request parameters', async () => {
		const registerResponse = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'Test Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		});

		const clientId = registerResponse.body.client_id;

		const response = await testServer.authAgentFor(owner).get('/mcp-oauth/authorize').query({
			client_id: clientId,
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: 'test-challenge-string-must-be-long-enough-for-validation',
			code_challenge_method: 'S256',
			state: 'random-state',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(200);
	});

	test('should not reject authorization just because MCP access is disabled', async () => {
		// Availability of the shared OAuth server is decoupled from the instance
		// MCP toggle (IAM-798), so the endpoint behaves normally rather than 403.
		await mcpSettingsService.setEnabled(false);

		const response = await testServer.restlessAgent.get('/mcp-oauth/authorize').query({
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: 'challenge',
			code_challenge_method: 'S256',
		});

		expect(response.statusCode).not.toBe(403);
		expect([302, 400, 401]).toContain(response.statusCode);
	});
});

describe('POST /mcp-oauth/token', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should be accessible without authentication', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/token').send({
			grant_type: 'authorization_code',
			code: 'invalid-code',
			client_id: 'test-client',
		});

		expect(response.statusCode).not.toBe(401);
	});

	test('should return error for invalid authorization code', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/token').send({
			grant_type: 'authorization_code',
			code: 'invalid-authorization-code',
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			code_verifier: 'test-verifier',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body.error).toBeDefined();
	});

	test('should validate grant_type parameter', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/token').send({
			grant_type: 'invalid_grant_type',
			code: 'test-code',
			client_id: 'test-client',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body.error).toBeDefined();
	});

	test('should serve token requests even when MCP access is disabled', async () => {
		// The token service stays available for other OAuth-protected resources
		// regardless of the instance MCP toggle (IAM-798): an invalid code yields
		// a normal OAuth error rather than a blanket 403.
		await mcpSettingsService.setEnabled(false);

		const response = await testServer.restlessAgent.post('/mcp-oauth/token').send({
			grant_type: 'authorization_code',
			code: 'invalid-authorization-code',
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			code_verifier: 'test-verifier',
		});

		expect(response.statusCode).not.toBe(403);
		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body.error).toBeDefined();
	});
});

describe('POST /mcp-oauth/revoke', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should be accessible without authentication', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/revoke').send({
			token: 'test-token',
			client_id: 'test-client',
		});

		expect(response.statusCode).not.toBe(401);
	});

	test('should accept token revocation request', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/revoke').send({
			token: 'some-token-to-revoke',
			client_id: 'test-client',
			token_type_hint: 'access_token',
		});

		expect([200, 204, 400]).toContain(response.statusCode);
	});

	test('should handle revocation without token_type_hint', async () => {
		const response = await testServer.restlessAgent.post('/mcp-oauth/revoke').send({
			token: 'some-token',
			client_id: 'test-client',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(200);
	});

	test('should serve revocation even when MCP access is disabled', async () => {
		// Revocation stays available regardless of the instance MCP toggle (IAM-798).
		await mcpSettingsService.setEnabled(false);

		const response = await testServer.restlessAgent.post('/mcp-oauth/revoke').send({
			token: 'test-token',
			client_id: 'test-client',
		});

		expect(response.statusCode).not.toBe(403);
		expect(response.statusCode).toBeGreaterThanOrEqual(200);
	});
});

describe('OAuth Discovery - Cross-validation', () => {
	test('should have consistent URLs between authorization server and protected resource metadata', async () => {
		const authServerResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-authorization-server',
		);
		const protectedResourceResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(authServerResponse.statusCode).toBe(200);
		expect(protectedResourceResponse.statusCode).toBe(200);

		const authServer = authServerResponse.body;
		const protectedResource = protectedResourceResponse.body;

		expect(protectedResource.authorization_servers).toContain(authServer.issuer);
	});

	test('should have consistent scopes between authorization server and protected resource', async () => {
		const authServerResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-authorization-server',
		);
		const protectedResourceResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(authServerResponse.statusCode).toBe(200);
		expect(protectedResourceResponse.statusCode).toBe(200);

		const authServerScopes = authServerResponse.body.scopes_supported;
		const protectedResourceScopes = protectedResourceResponse.body.scopes_supported;

		expect(authServerScopes).toEqual(protectedResourceScopes);
	});
});

describe('Full authorization-code flow (PKCE)', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should mint a token pair via register → authorize → consent → token', async () => {
		const { createHash, randomBytes } = await import('node:crypto');
		const codeVerifier = randomBytes(32).toString('base64url');
		const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

		// 1. Dynamic Client Registration
		const registerResponse = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'Flow Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_method: 'none',
		});
		expect(registerResponse.statusCode).toBe(201);
		const clientId = registerResponse.body.client_id;

		// 2. Authorize — sets the OAuth session cookie and redirects to consent
		const authorizeResponse = await testServer.restlessAgent.get('/mcp-oauth/authorize').query({
			client_id: clientId,
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
			state: 'flow-state',
		});
		expect(authorizeResponse.statusCode).toBe(302);
		expect(authorizeResponse.headers.location).toBe('/oauth/consent');

		const rawSetCookie: string | string[] = authorizeResponse.headers['set-cookie'] ?? [];
		const setCookies = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
		const sessionCookie = setCookies
			.map((cookie) => cookie.split(';')[0])
			.find((cookie) => cookie.startsWith('n8n-oauth-session='));
		expect(sessionCookie).toBeDefined();

		// 3. Consent approval as an authenticated user
		const authAgent = testServer.authAgentFor(owner);
		authAgent.jar.setCookie(sessionCookie ?? '');
		const consentResponse = await authAgent.post('/consent/approve').send({ approved: true });
		expect(consentResponse.statusCode).toBe(200);

		const redirectUrl = new URL(consentResponse.body.data.redirectUrl);
		const code = redirectUrl.searchParams.get('code');
		expect(code).toBeTruthy();
		expect(redirectUrl.searchParams.get('state')).toBe('flow-state');

		// 4. Token exchange
		const tokenResponse = await testServer.restlessAgent
			.post('/mcp-oauth/token')
			.type('form')
			.send({
				grant_type: 'authorization_code',
				code: code!,
				client_id: clientId,
				code_verifier: codeVerifier,
				redirect_uri: 'https://example.com/callback',
			});
		expect(tokenResponse.body).toEqual({
			access_token: expect.any(String),
			token_type: 'Bearer',
			expires_in: 3600,
			refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
		});
		expect(tokenResponse.statusCode).toBe(200);

		// 5. Refresh-token rotation
		const refreshResponse = await testServer.restlessAgent
			.post('/mcp-oauth/token')
			.type('form')
			.send({
				grant_type: 'refresh_token',
				refresh_token: tokenResponse.body.refresh_token,
				client_id: clientId,
			});
		expect(refreshResponse.statusCode).toBe(200);
		expect(refreshResponse.body.access_token).toEqual(expect.any(String));
		expect(refreshResponse.body.access_token).not.toBe(tokenResponse.body.access_token);
	});
});

describe('Neutral /oauth/* endpoint aliases', () => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	afterEach(async () => {
		await mcpSettingsService.setEnabled(false);
	});

	test('should register a client via /oauth/register identically to /mcp-oauth/register', async () => {
		const clientData = {
			client_name: 'Alias Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		};

		const response = await testServer.restlessAgent.post('/oauth/register').send(clientData);

		expect(response.statusCode).toBe(201);
		expect(response.body.client_id).toBeDefined();
		expect(response.body.client_name).toBe('Alias Client');
	});

	test('should serve /oauth/token with the same error semantics as /mcp-oauth/token', async () => {
		const response = await testServer.restlessAgent.post('/oauth/token').send({
			grant_type: 'authorization_code',
			code: 'invalid-authorization-code',
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			code_verifier: 'test-verifier',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.body.error).toBeDefined();
	});

	test('should serve /oauth/authorize', async () => {
		const response = await testServer.restlessAgent.get('/oauth/authorize').query({
			client_id: 'test-client',
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: 'challenge',
			code_challenge_method: 'S256',
		});

		expect([302, 400, 401, 403]).toContain(response.statusCode);
		expect(response.statusCode).not.toBe(404);
	});

	test('should serve /oauth/revoke', async () => {
		const response = await testServer.restlessAgent.post('/oauth/revoke').send({
			token: 'some-token',
			client_id: 'test-client',
		});

		expect(response.statusCode).toBeGreaterThanOrEqual(200);
		expect(response.statusCode).not.toBe(404);
	});

	test('should serve /oauth/* endpoints even when MCP access is disabled', async () => {
		await mcpSettingsService.setEnabled(false);

		const response = await testServer.restlessAgent.post('/oauth/register').send({
			client_name: 'Alias Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code'],
			token_endpoint_auth_method: 'none',
		});

		expect(response.statusCode).toBe(201);
		expect(response.body.client_id).toBeDefined();
	});
});

describe('OAuth server decoupled from MCP access (IAM-798)', () => {
	beforeEach(async () => {
		// MCP access stays OFF for every test in this block: protecting a resource
		// with n8n OAuth must not depend on the instance MCP server being exposed.
		await mcpSettingsService.setEnabled(false);
	});

	test('should serve discovery documents while MCP access is disabled', async () => {
		const authServerResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-authorization-server',
		);
		const protectedResourceResponse = await testServer.restlessAgent.get(
			'/.well-known/oauth-protected-resource/mcp-server/http',
		);

		expect(authServerResponse.statusCode).toBe(200);
		expect(protectedResourceResponse.statusCode).toBe(200);
	});

	test('should mint a token pair end-to-end while MCP access is disabled', async () => {
		const { createHash, randomBytes } = await import('node:crypto');
		const codeVerifier = randomBytes(32).toString('base64url');
		const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

		// 1. Dynamic Client Registration
		const registerResponse = await testServer.restlessAgent.post('/mcp-oauth/register').send({
			client_name: 'Decoupled Flow Client',
			redirect_uris: ['https://example.com/callback'],
			grant_types: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_method: 'none',
		});
		expect(registerResponse.statusCode).toBe(201);
		const clientId = registerResponse.body.client_id;

		// 2. Authorize — sets the OAuth session cookie and redirects to consent
		const authorizeResponse = await testServer.restlessAgent.get('/mcp-oauth/authorize').query({
			client_id: clientId,
			redirect_uri: 'https://example.com/callback',
			response_type: 'code',
			code_challenge: codeChallenge,
			code_challenge_method: 'S256',
			state: 'decoupled-state',
		});
		expect(authorizeResponse.statusCode).toBe(302);
		expect(authorizeResponse.headers.location).toBe('/oauth/consent');

		const rawSetCookie: string | string[] = authorizeResponse.headers['set-cookie'] ?? [];
		const setCookies = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
		const sessionCookie = setCookies
			.map((cookie) => cookie.split(';')[0])
			.find((cookie) => cookie.startsWith('n8n-oauth-session='));
		expect(sessionCookie).toBeDefined();

		// 3. Consent approval as an authenticated user
		const authAgent = testServer.authAgentFor(owner);
		authAgent.jar.setCookie(sessionCookie ?? '');
		const consentResponse = await authAgent.post('/consent/approve').send({ approved: true });
		expect(consentResponse.statusCode).toBe(200);

		const redirectUrl = new URL(consentResponse.body.data.redirectUrl);
		const code = redirectUrl.searchParams.get('code');
		expect(code).toBeTruthy();

		// 4. Token exchange — the token service functions with MCP access disabled
		const tokenResponse = await testServer.restlessAgent
			.post('/mcp-oauth/token')
			.type('form')
			.send({
				grant_type: 'authorization_code',
				code: code!,
				client_id: clientId,
				code_verifier: codeVerifier,
				redirect_uri: 'https://example.com/callback',
			});
		expect(tokenResponse.statusCode).toBe(200);
		expect(tokenResponse.body).toEqual({
			access_token: expect.any(String),
			token_type: 'Bearer',
			expires_in: 3600,
			refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
		});
	});
});

describe('IP rate limit configuration', () => {
	const windowMs = 5 * 60 * 1000;

	let OAuthController: typeof OAuthControllerClass;

	beforeAll(async () => {
		({ OAuthController } = await import('../oauth.controller'));
	});

	test('applies the configured limits to the shared OAuth endpoints', () => {
		const config = Container.get(OAuthServerConfig);
		const limitsBySuffix: Array<[suffix: string, limit: number]> = [
			['/register', config.rateLimitRegister],
			['/authorize', config.rateLimitAuthorize],
			['/token', config.rateLimitToken],
			['/revoke', config.rateLimitRevoke],
		];

		for (const router of OAuthController.routers) {
			const match = limitsBySuffix.find(([suffix]) => router.path.endsWith(suffix));
			expect(match).toBeDefined();
			expect(router.ipRateLimit).toEqual({ limit: match![1], windowMs });
		}
	});

	test.each([
		'metadata',
		'metadataOptions',
		'protectedResourceMetadata',
		'protectedResourceMetadataOptions',
	])('applies the configured well-known limit to %s', (handlerName) => {
		const config = Container.get(OAuthServerConfig);
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			OAuthController as unknown as Controller,
			handlerName,
		);

		expect(routeMetadata.ipRateLimit).toEqual({ limit: config.rateLimitWellKnown, windowMs });
	});
});
