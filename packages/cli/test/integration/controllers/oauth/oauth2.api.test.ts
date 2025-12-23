import { testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { response as Response } from 'express';
import nock from 'nock';
import { parse as parseQs } from 'querystring';

import { CredentialsHelper } from '@/credentials-helper';
import { ExternalHooks } from '@/external-hooks';
import { OauthService } from '@/oauth/oauth.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

describe('OAuth2 API', () => {
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

	it('should allow external hook to modify oAuthOptions and state', async () => {
		const externalHooks = Container.get(ExternalHooks);
		const oauthService = Container.get(OauthService);

		// Mock the external hook to modify both redirectUri and state
		const hookSpy = jest.fn(async function (oAuthOptions) {
			// Modify redirectUri directly in oAuthOptions
			oAuthOptions.redirectUri = 'https://custom.domain/callback';

			// Decode base64 state, add host property, and re-encode
			const stateJson = JSON.parse(Buffer.from(oAuthOptions.state, 'base64').toString());
			stateJson.host = 'custom.host.com';
			oAuthOptions.state = Buffer.from(JSON.stringify(stateJson)).toString('base64');
		});

		externalHooks['registered']['oauth2.authenticate'] = [hookSpy];

		const response = await ownerAgent
			.get('/oauth2-credential/auth')
			.query({ id: credential.id })
			.expect(200);

		const authUrl = new URL(response.body.data);
		const queryParams = parseQs(authUrl.search.slice(1));

		// Verify the hook was called
		expect(hookSpy).toHaveBeenCalledTimes(1);

		// Verify redirectUri was modified
		expect(queryParams.redirect_uri).toBe('https://custom.domain/callback');

		// Verify the state was encrypted (should be different from the base64 input)
		expect(queryParams.state).toBeDefined();
		expect(typeof queryParams.state).toBe('string');

		// Decrypt and verify the state contains the host property
		const decryptedState = oauthService['cipher'].decrypt(queryParams.state as string);
		const stateObject = JSON.parse(decryptedState);
		expect(stateObject.host).toBe('custom.host.com');
		expect(stateObject.cid).toBe(credential.id); // Original CSRF data should still be there
	});

	it('should fail on auth when callback is called as another user', async () => {
		const oauthService = Container.get(OauthService);
		const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
		const renderSpy = (Response.render = jest.fn(function () {
			this.end();
		}));

		await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

		const [_, state] = csrfSpy.mock.results[0].value;

		await testServer
			.authAgentFor(anotherUser)
			.get('/oauth2-credential/callback')
			.query({ code: 'auth_code', state })
			.expect(200);

		expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
			error: { message: 'Unauthorized' },
		});
	});

	it('should handle a valid callback without auth', async () => {
		const oauthService = Container.get(OauthService);
		const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
		const renderSpy = (Response.render = jest.fn(function () {
			this.end();
		}));

		await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);

		const [_, state] = csrfSpy.mock.results[0].value;

		nock('https://test.domain').post('/oauth2/token').reply(200, { access_token: 'updated_token' });

		await ownerAgent
			.get('/oauth2-credential/callback')
			.query({ code: 'auth_code', state })
			.expect(200);

		expect(renderSpy).toHaveBeenCalledWith('oauth-callback');

		const updatedCredential = await Container.get(CredentialsHelper).getCredentials(
			credential,
			credential.type,
		);
		expect(updatedCredential.getData()).toEqual({
			...credentialData,
			oauthTokenData: { access_token: 'updated_token' },
		});
	});
});
