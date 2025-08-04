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
const oauth1_credential_controller_1 = require('@/controllers/oauth/oauth1-credential.controller');
const credentials_finder_service_1 = require('@/credentials/credentials-finder.service');
const credentials_helper_1 = require('@/credentials-helper');
const variables_service_ee_1 = require('@/environments.ee/variables/variables.service.ee');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const external_hooks_1 = require('@/external-hooks');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
jest.mock('@/workflow-execute-additional-data');
describe('OAuth1CredentialController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	(0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
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
		type: 'oAuth1Api',
		data: cipher.encrypt({}),
	});
	const controller = di_1.Container.get(oauth1_credential_controller_1.OAuth1CredentialController);
	const timestamp = 1706750625678;
	jest.useFakeTimers({ advanceTimers: true });
	beforeEach(() => {
		jest.setSystemTime(new Date(timestamp));
		jest.clearAllMocks();
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
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				authUrl: 'https://example.domain/oauth/authorize',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			});
			(0, nock_1.default)('https://example.domain')
				.post('/oauth/request_token', {
					oauth_callback:
						'http://localhost:5678/rest/oauth1-credential/callback?state=eyJ0b2tlbiI6InRva2VuIiwiY2lkIjoiMSIsImNyZWF0ZWRBdCI6MTcwNjc1MDYyNTY3OCwidXNlcklkIjoiMTIzIn0=',
				})
				.once()
				.reply(200, { oauth_token: 'random-token' });
			const req = (0, jest_mock_extended_1.mock)({ user, query: { id: '1' } });
			const authUri = await controller.getAuthUri(req);
			expect(authUri).toEqual('https://example.domain/oauth/authorize?oauth_token=random-token');
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth1Api',
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
			query: {
				oauth_verifier: 'verifier',
				oauth_token: 'token',
				state: validState,
			},
		});
		it('should render the error page when required query params are missing', async () => {
			const invalidReq = (0, jest_mock_extended_1.mock)();
			invalidReq.query = { state: 'test' };
			await controller.handleCallback(invalidReq, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'Insufficient parameters for OAuth1 callback.',
					reason: 'Received following query parameters: {"state":"test"}',
				},
			});
			expect(credentialsRepository.findOneBy).not.toHaveBeenCalled();
		});
		it('should render the error page when `state` query param is invalid', async () => {
			const invalidReq = (0, jest_mock_extended_1.mock)({
				query: {
					oauth_verifier: 'verifier',
					oauth_token: 'token',
					state: 'test',
				},
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
		it('should render the error page when state differs from the stored state in the credential', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret: 'invalid' });
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
		});
		it('should render the error page when state is older than 5 minutes', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret });
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			jest.advanceTimersByTime(10 * constants_1.Time.minutes.toMilliseconds);
			await controller.handleCallback(req, res);
			expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
				error: {
					message: 'The OAuth callback state is invalid!',
				},
			});
		});
		it('should exchange the code for a valid token, and save it to DB', async () => {
			credentialsRepository.findOneBy.mockResolvedValue(credential);
			credentialsHelper.getDecrypted.mockResolvedValue({ csrfSecret });
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValueOnce({
				requestTokenUrl: 'https://example.domain/oauth/request_token',
				accessTokenUrl: 'https://example.domain/oauth/access_token',
				signatureMethod: 'HMAC-SHA1',
			});
			jest.spyOn(csrf_1.default.prototype, 'verify').mockReturnValueOnce(true);
			(0, nock_1.default)('https://example.domain')
				.post('/oauth/access_token', 'oauth_token=token&oauth_verifier=verifier')
				.once()
				.reply(200, 'access_token=new_token');
			await controller.handleCallback(req, res);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'1',
				expect.objectContaining({
					data: dataCaptor,
					id: '1',
					name: 'Test Credential',
					type: 'oAuth1Api',
				}),
			);
			expect(cipher.decrypt(dataCaptor.value)).toEqual(
				JSON.stringify({ oauthTokenData: { access_token: 'new_token' } }),
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
	});
});
//# sourceMappingURL=oauth1-credential.controller.test.js.map
