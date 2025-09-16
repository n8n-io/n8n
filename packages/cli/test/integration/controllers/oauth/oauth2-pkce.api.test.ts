import { testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { response as Response } from 'express';
import nock from 'nock';
import { parse as parseQs } from 'querystring';

import { OAuth2CredentialController } from '@/controllers/oauth/oauth2-credential.controller';
import { CredentialsHelper } from '@/credentials-helper';
import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

describe('OAuth2 PKCE API', () => {
	const testServer = setupTestServer({ endpointGroups: ['oauth2'] });

	let owner: User;
	let ownerAgent: SuperAgentTest;
	let pkceCredential: CredentialsEntity;
	const pkceCredentialData = {
		grantType: 'pkce',
		clientId: 'pkce_client_id',
		// No client secret for public PKCE client
		authUrl: 'https://test.domain/oauth2/auth',
		accessTokenUrl: 'https://test.domain/oauth2/token',
		authQueryParameters: 'access_type=offline',
	};

	let confidentialPkceCredential: CredentialsEntity;
	const confidentialPkceCredentialData = {
		grantType: 'pkce',
		clientId: 'confidential_pkce_client_id',
		clientSecret: 'confidential_client_secret',
		authUrl: 'https://test.domain/oauth2/auth',
		accessTokenUrl: 'https://test.domain/oauth2/token',
		authQueryParameters: 'access_type=offline',
	};

	CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (_, decryptedDataOriginal) =>
		decryptedDataOriginal;

	beforeAll(async () => {
		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);

		// Create public PKCE credential (no client secret)
		pkceCredential = await saveCredential(
			{
				name: 'PKCE Public Client',
				type: 'oAuth2Api',
				data: pkceCredentialData,
			},
			{
				user: owner,
				role: 'credential:owner',
			},
		);

		// Create confidential PKCE credential (with client secret)
		confidentialPkceCredential = await saveCredential(
			{
				name: 'PKCE Confidential Client',
				type: 'oAuth2Api',
				data: confidentialPkceCredentialData,
			},
			{
				user: owner,
				role: 'credential:owner',
			},
		);
	});

	describe('PKCE E2E Flow', () => {
		// Focus on complete end-to-end flow testing rather than duplicating unit test scenarios
		it('should complete full PKCE flow for public client without client_secret', async () => {
			const controller = Container.get(OAuth2CredentialController);
			const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Initiate auth flow to get state and code_verifier
			await ownerAgent.get('/oauth2-credential/auth').query({ id: pkceCredential.id }).expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Mock the token exchange endpoint
			nock('https://test.domain')
				.post('/oauth2/token')
				.reply(200, function (uri, requestBody: string) {
					// Verify PKCE parameters are sent correctly for public client
					expect(requestBody).toContain('grant_type=authorization_code');
					expect(requestBody).toContain('client_id=pkce_client_id');
					expect(requestBody).toContain('code_verifier=');
					// Should NOT contain client_secret for public client
					expect(requestBody).not.toContain('client_secret=');

					return {
						access_token: 'pkce_access_token',
						refresh_token: 'pkce_refresh_token',
						token_type: 'Bearer',
					};
				});

			await ownerAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state })
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith('oauth-callback');

			// Verify token was saved correctly
			const updatedCredential = await Container.get(CredentialsHelper).getCredentials(
				pkceCredential,
				pkceCredential.type,
			);
			const credentialData = updatedCredential.getData();
			expect(credentialData.oauthTokenData).toEqual({
				access_token: 'pkce_access_token',
				refresh_token: 'pkce_refresh_token',
				token_type: 'Bearer',
			});
		});

		it('should complete full PKCE flow for confidential client with client_secret', async () => {
			const controller = Container.get(OAuth2CredentialController);
			const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Initiate auth flow
			await ownerAgent
				.get('/oauth2-credential/auth')
				.query({ id: confidentialPkceCredential.id })
				.expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Mock token exchange for confidential PKCE client
			nock('https://test.domain')
				.post('/oauth2/token')
				.reply(200, function (uri, requestBody: string) {
					// Should include client credentials via Basic Auth header for confidential clients
					const authHeader = this.req.headers.authorization;
					expect(authHeader).toMatch(/^Basic /);

					// Body should still contain PKCE parameters
					expect(requestBody).toContain('grant_type=authorization_code');
					expect(requestBody).toContain('code_verifier=');
					// client_id should NOT be in body when using Basic Auth
					expect(requestBody).not.toContain('client_id=');

					return {
						access_token: 'confidential_pkce_access_token',
						refresh_token: 'confidential_pkce_refresh_token',
					};
				});

			await ownerAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state })
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith('oauth-callback');
		});
	});

	describe('Error Handling', () => {
		it('should handle PKCE token exchange failure', async () => {
			const controller = Container.get(OAuth2CredentialController);
			const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			await ownerAgent.get('/oauth2-credential/auth').query({ id: pkceCredential.id }).expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Mock token exchange failure
			nock('https://test.domain')
				.post('/oauth2/token')
				.reply(400, {
					error: 'invalid_grant',
					error_description: 'Code verifier failed verification',
				});

			await ownerAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'invalid_code', state })
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message:
						'The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.',
					reason:
						'{"error":"invalid_grant","error_description":"Code verifier failed verification"}',
				},
			});
		});
	});
});
