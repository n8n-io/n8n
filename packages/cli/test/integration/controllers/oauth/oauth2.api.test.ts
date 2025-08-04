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
		const controller = Container.get(OAuth2CredentialController);
		const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();

		const response = await ownerAgent
			.get('/oauth2-credential/auth')
			.query({ id: credential.id })
			.expect(200);
		const authUrl = new URL(response.body.data);
		expect(authUrl.hostname).toBe('test.domain');
		expect(authUrl.pathname).toBe('/oauth2/auth');

		expect(csrfSpy).toHaveBeenCalled();
		const [_, state] = csrfSpy.mock.results[0].value;
		expect(parseQs(authUrl.search.slice(1))).toEqual({
			access_type: 'offline',
			client_id: 'client_id',
			redirect_uri: 'http://localhost:5678/rest/oauth2-credential/callback',
			response_type: 'code',
			state,
			scope: 'openid',
		});
	});

	it('should fail on auth when callback is called as another user', async () => {
		const controller = Container.get(OAuth2CredentialController);
		const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
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
		const controller = Container.get(OAuth2CredentialController);
		const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
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
