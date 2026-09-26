import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createHash } from 'node:crypto';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';

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

describe.each(['/mcp-oauth', '/oauth'])('%s client authentication', (basePath) => {
	beforeEach(async () => {
		await mcpSettingsService.setEnabled(true);
	});

	test('exchanges, refreshes, and revokes tokens with HTTP Basic authentication', async () => {
		const redirectUri = 'http://localhost:12345/callback';
		const registration = await testServer.restlessAgent.post(`${basePath}/register`).send({
			client_name: 'Desktop OAuth test',
			redirect_uris: [redirectUri],
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
		});
		expect(registration.statusCode).toBe(201);
		const { client_id: clientId, client_secret: clientSecret } = registration.body;
		expect(clientSecret).toEqual(expect.any(String));

		const verifier = 'a'.repeat(43);
		const challenge = createHash('sha256').update(verifier).digest('base64url');
		const code = await Container.get(OAuthAuthorizationCodeService).createAuthorizationCode(
			clientId,
			owner.id,
			redirectUri,
			challenge,
			null,
			undefined,
			['workflow:read'],
		);
		const authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
		const invalidSecret = await testServer.restlessAgent
			.post(`${basePath}/token`)
			.auth(clientId, 'incorrect-secret')
			.type('form')
			.send({
				grant_type: 'authorization_code',
				code,
				code_verifier: verifier,
				redirect_uri: redirectUri,
			});
		expect(invalidSecret.statusCode).toBe(400);
		expect(invalidSecret.body.error).toBe('invalid_client');

		const invalidVerifier = await testServer.restlessAgent
			.post(`${basePath}/token`)
			.set('Authorization', authorization)
			.type('form')
			.send({
				grant_type: 'authorization_code',
				code,
				code_verifier: 'b'.repeat(43),
				redirect_uri: redirectUri,
			});
		expect(invalidVerifier.statusCode).toBe(400);
		expect(invalidVerifier.body.error).toBe('invalid_grant');

		const token = await testServer.restlessAgent
			.post(`${basePath}/token`)
			.set('Authorization', authorization)
			.type('form')
			.send({
				grant_type: 'authorization_code',
				code,
				code_verifier: verifier,
				redirect_uri: redirectUri,
			});
		expect(token.body).toEqual(
			expect.objectContaining({
				access_token: expect.any(String),
				refresh_token: expect.any(String),
				token_type: 'Bearer',
				scope: 'workflow:read',
			}),
		);
		expect(token.statusCode).toBe(200);

		const refreshed = await testServer.restlessAgent
			.post(`${basePath}/token`)
			.set('Authorization', authorization)
			.type('form')
			.send({ grant_type: 'refresh_token', refresh_token: token.body.refresh_token });
		expect(refreshed.statusCode).toBe(200);
		expect(refreshed.body.scope).toBe('workflow:read');
		expect(refreshed.body.refresh_token).not.toBe(token.body.refresh_token);

		const revoked = await testServer.restlessAgent
			.post(`${basePath}/revoke`)
			.set('Authorization', authorization)
			.type('form')
			.send({ token: refreshed.body.refresh_token, token_type_hint: 'refresh_token' });
		expect(revoked.statusCode).toBe(200);
		const afterRevocation = await testServer.restlessAgent
			.post(`${basePath}/token`)
			.set('Authorization', authorization)
			.type('form')
			.send({ grant_type: 'refresh_token', refresh_token: refreshed.body.refresh_token });
		expect(afterRevocation.statusCode).toBe(400);
		expect(afterRevocation.body.error).toBe('invalid_grant');
	});
});
