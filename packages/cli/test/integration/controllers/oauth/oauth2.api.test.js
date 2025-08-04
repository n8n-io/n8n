'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const express_1 = require('express');
const nock_1 = __importDefault(require('nock'));
const querystring_1 = require('querystring');
const oauth2_credential_controller_1 = require('@/controllers/oauth/oauth2-credential.controller');
const credentials_helper_1 = require('@/credentials-helper');
const credentials_1 = require('@test-integration/db/credentials');
const users_1 = require('@test-integration/db/users');
const utils_1 = require('@test-integration/utils');
describe('OAuth2 API', () => {
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['oauth2'] });
	let owner;
	let anotherUser;
	let ownerAgent;
	let credential;
	const credentialData = {
		clientId: 'client_id',
		clientSecret: 'client_secret',
		authUrl: 'https://test.domain/oauth2/auth',
		accessTokenUrl: 'https://test.domain/oauth2/token',
		authQueryParameters: 'access_type=offline',
	};
	credentials_helper_1.CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (
		_,
		decryptedDataOriginal,
	) => decryptedDataOriginal;
	beforeAll(async () => {
		owner = await (0, users_1.createOwner)();
		anotherUser = await (0, users_1.createMember)();
		ownerAgent = testServer.authAgentFor(owner);
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		credential = await (0, credentials_1.saveCredential)(
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
		const controller = di_1.Container.get(
			oauth2_credential_controller_1.OAuth2CredentialController,
		);
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
		expect((0, querystring_1.parse)(authUrl.search.slice(1))).toEqual({
			access_type: 'offline',
			client_id: 'client_id',
			redirect_uri: 'http://localhost:5678/rest/oauth2-credential/callback',
			response_type: 'code',
			state,
			scope: 'openid',
		});
	});
	it('should fail on auth when callback is called as another user', async () => {
		const controller = di_1.Container.get(
			oauth2_credential_controller_1.OAuth2CredentialController,
		);
		const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
		const renderSpy = (express_1.response.render = jest.fn(function () {
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
		const controller = di_1.Container.get(
			oauth2_credential_controller_1.OAuth2CredentialController,
		);
		const csrfSpy = jest.spyOn(controller, 'createCsrfState').mockClear();
		const renderSpy = (express_1.response.render = jest.fn(function () {
			this.end();
		}));
		await ownerAgent.get('/oauth2-credential/auth').query({ id: credential.id }).expect(200);
		const [_, state] = csrfSpy.mock.results[0].value;
		(0, nock_1.default)('https://test.domain')
			.post('/oauth2/token')
			.reply(200, { access_token: 'updated_token' });
		await ownerAgent
			.get('/oauth2-credential/callback')
			.query({ code: 'auth_code', state })
			.expect(200);
		expect(renderSpy).toHaveBeenCalledWith('oauth-callback');
		const updatedCredential = await di_1.Container.get(
			credentials_helper_1.CredentialsHelper,
		).getCredentials(credential, credential.type);
		expect(updatedCredential.getData()).toEqual({
			...credentialData,
			oauthTokenData: { access_token: 'updated_token' },
		});
	});
});
//# sourceMappingURL=oauth2.api.test.js.map
