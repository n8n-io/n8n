/**
 * Integration tests for OAuth2 callback with N8N_SKIP_AUTH_ON_OAUTH_CALLBACK=true
 *
 * IMPORTANT: Environment variable must be set before module imports
 * because skipAuthOnOAuthCallback is evaluated at module load time.
 */

// Set environment variable before any imports
process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = 'true';

import { testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { response as Response } from 'express';
import nock from 'nock';
import { parse as parseQs } from 'querystring';

import { CredentialsHelper } from '@/credentials-helper';
import { OauthService } from '@/oauth/oauth.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

describe('OAuth2 API with skipAuthOnOAuthCallback enabled', () => {
	const testServer = setupTestServer({ endpointGroups: ['oauth2'] });

	let owner: User;
	let anotherUser: User;
	let ownerAgent: SuperAgentTest;
	let credential: CredentialsEntity;
	const credentialData = {
		clientId: 'client_id',
		clientSecret: 'client_secret',
		authUrl: 'https://test.domain/oauth2/auth',
		accessTokenUrl: 'https://test.domain/oauth2/token',
		authQueryParameters: 'access_type=offline',
	};

	CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (_, decryptedDataOriginal) =>
		decryptedDataOriginal;

	beforeAll(async () => {
		owner = await createOwner();
		anotherUser = await createMember();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		credential = await saveCredential(
			{
				name: 'Test',
				type: 'testOAuth2Api',
				data: credentialData,
			},
			{
				user: owner,
				role: 'credential:owner',
			},
		);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(async () => {
		// Clean up environment variable
		delete process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;
	});

	describe('OAuth callback without authentication', () => {
		it('should handle OAuth callback without authentication when skipAuthOnOAuthCallback is enabled', async () => {
			const oauthService = Container.get(OauthService);
			const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Step 1: Owner initiates OAuth flow (authenticated)
			await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Step 2: Mock external OAuth provider response
			nock('https://test.domain')
				.post('/oauth2/token')
				.reply(200, { access_token: 'new_access_token' });

			// Step 3: Callback arrives WITHOUT authentication
			// This simulates the real-world scenario where skipAuth: true is configured
			// and the OAuth provider redirects back without going through auth middleware
			await testServer.authlessAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state })
				.expect(200);

			// Verify success - should NOT render error page
			expect(renderSpy).toHaveBeenCalledWith('oauth-callback');
			expect(renderSpy).not.toHaveBeenCalledWith('oauth-error-callback', expect.anything());

			// Verify credential was updated with OAuth token
			const updatedCredential = await Container.get(CredentialsHelper).getCredentials(
				credential,
				credential.type,
			);
			expect(updatedCredential.getData()).toEqual({
				...credentialData,
				oauthTokenData: { access_token: 'new_access_token' },
			});
		});

		it('should allow callback completion by any user when skipAuthOnOAuthCallback is enabled', async () => {
			const oauthService = Container.get(OauthService);
			const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Step 1: Owner initiates OAuth flow
			await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Step 2: Mock external OAuth provider response
			nock('https://test.domain')
				.post('/oauth2/token')
				.reply(200, { access_token: 'different_user_token' });

			// Step 3: Different user completes the callback
			// When skipAuth is enabled, userId validation is skipped
			// This is intentional for scenarios where auth middleware cannot run
			await testServer
				.authAgentFor(anotherUser)
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state })
				.expect(200);

			// Should succeed without error
			expect(renderSpy).toHaveBeenCalledWith('oauth-callback');
			expect(renderSpy).not.toHaveBeenCalledWith('oauth-error-callback', expect.anything());

			// Verify credential was updated
			const updatedCredential = await Container.get(CredentialsHelper).getCredentials(
				credential,
				credential.type,
			);
			expect(updatedCredential.getData()).toEqual({
				...credentialData,
				oauthTokenData: { access_token: 'different_user_token' },
			});
		});
	});

	describe('OAuth flow initiation', () => {
		it('should return a valid auth URL when the auth flow is initiated', async () => {
			const oauthService = Container.get(OauthService);
			const encryptSpy = jest.spyOn(oauthService, 'encryptBase64EncodedState').mockClear();

			const response = await ownerAgent
				.get('/oauth2-credential/auth')
				.query({ id: credential.id })
				.expect(200);

			const authUrl = new URL(response.body.data);
			expect(authUrl.hostname).toBe('test.domain');
			expect(authUrl.pathname).toBe('/oauth2/auth');

			expect(encryptSpy).toHaveBeenCalled();
			const state = encryptSpy.mock.results[0].value;
			expect(parseQs(authUrl.search.slice(1))).toEqual({
				access_type: 'offline',
				client_id: 'client_id',
				redirect_uri: 'http://localhost:5678/rest/oauth2-credential/callback',
				response_type: 'code',
				state,
				scope: 'openid',
			});
		});
	});

	describe('Error handling', () => {
		it('should still validate CSRF state even when skipAuthOnOAuthCallback is enabled', async () => {
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Attempt callback with invalid state
			await testServer.authlessAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state: 'invalid_state' })
				.expect(200);

			// Should render error due to invalid CSRF state
			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: expect.objectContaining({
					message: expect.any(String),
				}),
			});
		});

		it('should handle OAuth provider errors gracefully', async () => {
			const oauthService = Container.get(OauthService);
			const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Initiate OAuth flow
			await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

			const [_, state] = csrfSpy.mock.results[0].value;

			// Mock OAuth provider returning an error
			nock('https://test.domain').post('/oauth2/token').reply(400, {
				error: 'invalid_grant',
				error_description: 'Authorization code has expired',
			});

			// Callback should handle provider error
			await testServer.authlessAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'expired_code', state })
				.expect(200);

			// Should render error callback
			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: expect.objectContaining({
					message: expect.any(String),
				}),
			});
		});
	});

	describe('Security validation', () => {
		it('should not skip CSRF token validation when skipAuthOnOAuthCallback is enabled', async () => {
			const oauthService = Container.get(OauthService);
			const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = (Response.render = jest.fn(function () {
				this.end();
			}));

			// Initiate OAuth flow to get a valid state
			await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

			const [__, state] = csrfSpy.mock.results[0].value;

			// Tamper with the state (decrypt, modify, re-encrypt would be needed)
			// For this test, we'll use a completely different valid-looking but wrong state
			const tamperedState = state.replace(/[a-z]/, 'x');

			// Attempt callback with tampered state
			await testServer.authlessAgent
				.get('/oauth2-credential/callback')
				.query({ code: 'auth_code', state: tamperedState })
				.expect(200);

			// Should render error due to CSRF validation failure
			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: expect.objectContaining({
					message: expect.any(String),
				}),
			});
		});
	});
});
