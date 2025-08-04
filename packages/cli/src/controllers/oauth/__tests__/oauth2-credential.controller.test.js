'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const csrf_1 = __importDefault(require('csrf'));
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const nock_1 = __importDefault(require('nock'));
const constants_2 = require('@/constants');
const oauth2_credential_controller_1 = require('@/controllers/oauth/oauth2-credential.controller');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const credentials_helper_1 = require('@/credentials-helper');
const variables_service_ee_1 = require('@/environments.ee/variables/variables.service.ee');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const external_hooks_1 = require('@/external-hooks');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
jest.mock('@/workflow-execute-additional-data');
describe('OAuth2CredentialController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	(0, backend_test_utils_1.mockInstance)(n8n_core_1.ExternalSecretsProxy);
	(0, backend_test_utils_1.mockInstance)(variables_service_ee_1.VariablesService, {
		getAllCached: async () => [],
	});
	const additionalData = (0, jest_mock_extended_1.mock)();
	WorkflowExecuteAdditionalData.getBase.mockReturnValue(additionalData);
	const cipher = new n8n_core_1.Cipher(
		(0, jest_mock_extended_1.mock)({ encryptionKey: 'password' }),
	);
	di_1.Container.set(n8n_core_1.Cipher, cipher);
	const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const credentialsHelper = (0, backend_test_utils_1.mockInstance)(
		credentials_helper_1.CredentialsHelper,
	);
	const credentialsRepository = (0, backend_test_utils_1.mockInstance)(db_1.CredentialsRepository);
	const credentialsFinderService = (0, backend_test_utils_1.mockInstance)(
		credentials_finder_service_1.CredentialsFinderService,
	);
	const csrfSecret = 'csrf-secret';
	const user = (0, jest_mock_extended_1.mock)({
		id: '123',
		password: 'password',
		authIdentities: [],
		role: 'global:owner',
	});
	const credential = (0, jest_mock_extended_1.mock)({
		id: '1',
		name: 'Test Credential',
		type: 'oAuth2Api',
		data: cipher.encrypt({}),
	});
	const controller = di_1.Container.get(oauth2_credential_controller_1.OAuth2CredentialController);
	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });
	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
		credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue({
			clientId: 'test-client-id',
			clientSecret: 'oauth-secret',
			authUrl: 'https://example.domain/o/oauth2/v2/auth',
			accessTokenUrl: 'https://example.domain/token',
		});
	});
	describe('getAuthUri', () => {
		it('should throw a BadRequestError when credentialId is missing in the query', async () => {
			const req = (0, jest_mock_extended_1.mock)({ query: { id: '' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Required credential ID is missing'),
			);
		});
		it('should throw a NotFoundError when no matching credential is found for the user', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(null);
			const req = (0, jest_mock_extended_1.mock)({ user, query: { id: '1' } });
			await expect(controller.getAuthUri(req)).rejects.toThrowError(
				new not_found_error_1.NotFoundError('Credential not found'),
			);
		});
		it('should return a valid auth URI', async () => {
			jest.spyOn(csrf_1.default.prototype, 'secretSync').mockReturnValueOnce(csrfSecret);
			jest.spyOn(csrf_1.default.prototype, 'create').mockReturnValueOnce('token');
			credentialsFinderService.findCredentialForUser.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({});
			const req = (0, jest_mock_extended_1.mock)({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual(
				'https://example.domain/o/oauth2/v2/auth?client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback&response_type=code&state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSIsImNyZWF0ZWRBdCI6MTcwNjc1MDYyNTY3OCwidXNlcklkIjoiMTIzIn0%3D&scope=openid',
			);
			const state = new URL(authUri).searchParams.get('state');
			expect(JSON.parse(Buffer.from(state, 'base64').toString())).toEqual({
				token: 'token',
				cid: '1',
				createdAt: timestamp,
				userId: '123',
			});
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({ csrfSecret: 'csrf-secret' }),
			);
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				false,
			);
		});
	});
	describe('handleCallback', () => {
		const validState = Buffer.from(
			JSON.stringify({
				token: 'token',
				cid: '1',
				createdAt: timestamp,
			}),
		).toString('base64');
		const res = (0, jest_mock_extended_1.mock)();
		const req = (0, jest_mock_extended_1.mock)({
			query: { code: 'code', state: validState },
			originalUrl: '?code=code',
		});
		it('should render the error page when required query params are missing', async () => {
			const invalidReq = (0, jest_mock_extended_1.mock)({
				query: { code: undefined, state: undefined },
			});
			await controller.handleCallback(invalidReq, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth2 callback.',
					reason: 'Received following query parameters: undefined',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});
		it('should render the error page when `state` query param is invalid', async () => {
			const invalidReq = (0, jest_mock_extended_1.mock)({
				query: { code: 'code', state: 'invalid-state' },
			});
			await controller.handleCallback(invalidReq, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Invalid state format',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});
		it('should render the error page when credential is not found in DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(null);
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'OAuth callback failed because of insufficient permissions',
				},
			});
			expect(credentialsRepository.findOneBy).toHaveBeenCalledTimes(1);
			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({ id: '1' });
		});
		it('should render the error page when csrfSecret on the saved credential does not match the state', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(false);
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
			expect(externalHooks.run).not.toHaveBeenCalled();
		});
		it('should render the error page when state is older than 5 minutes', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			jest.advanceTimersByTime(10 * constants_1.Time.minutes.toMilliseconds);
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
			expect(externalHooks.run).not.toHaveBeenCalled();
		});
		it('should render the error page when code exchange fails', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(403, { error: 'Code could not be exchanged' });
			await controller.handleCallback(req, res);
			expect(externalHooks.run).toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Code could not be exchanged',
					reason: '{"error":"Code could not be exchanged"}',
				},
			});
		});
		it('should render the error page when code exchange fails, and the server responses with html', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(403, '<html><body>Code could not be exchanged</body></html>', {
					'Content-Type': 'text/html',
				});
			await controller.handleCallback(req, res);
			expect(externalHooks.run).toHaveBeenCalled();
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Unsupported content type: text/html',
					reason: '"<html><body>Code could not be exchanged</body></html>"',
				},
			});
		});
		it('should exchange the code for a valid token, and save it to DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });
			await controller.handleCallback(req, res);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: { access_token: 'access-token', refresh_token: 'refresh-token' },
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				credential,
				credential.type,
				'internal',
				undefined,
				true,
			);
		});
		it('merges oauthTokenData if it already exists', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				csrfSecret,
				oauthTokenData: { token: true },
			});
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });
			await controller.handleCallback(req, res);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: {
						token: true,
						access_token: 'access-token',
						refresh_token: 'refresh-token',
					},
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
		it('overwrites oauthTokenData if it is a string', async () => {
			credentialsRepository.findOneBy.mockResolvedValueOnce(credential);
			credentialsHelper.getDecrypted.mockResolvedValueOnce({
				csrfSecret,
				oauthTokenData: constants_2.CREDENTIAL_BLANKING_VALUE,
			});
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post(
					'/token',
					'code=code&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A5678%2Frest%2Foauth2-credential%2Fcallback',
				)
				.reply(200, { access_token: 'access-token', refresh_token: 'refresh-token' });
			await controller.handleCallback(req, res);
			expect(externalHooks.run).toHaveBeenCalledWith('oauth2.callback', [
				expect.objectContaining({
					clientId: 'test-client-id',
					redirectUri: 'http://localhost:5678/rest/oauth2-credential/callback',
				}),
			]);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth2Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({
					oauthTokenData: { access_token: 'access-token', refresh_token: 'refresh-token' },
				}),
			);
			expect(res.render).toHaveBeenCalledWith('oauth-callback');
		});
	});
});
//# sourceMappingURL=oauth2-credential.controller.test.js.map
