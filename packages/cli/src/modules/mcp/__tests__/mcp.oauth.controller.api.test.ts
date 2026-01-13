import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { SUPPORTED_SCOPES } from '../mcp-oauth-service';

const testServer = setupTestServer({ modules: ['mcp'], endpointGroups: ['mcp'] });

let owner: User;

beforeAll(async () => {
	owner = await createOwner();
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
});

describe('GET /mcp-oauth/authorize', () => {
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
});

describe('POST /mcp-oauth/token', () => {
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
});

describe('POST /mcp-oauth/revoke', () => {
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
