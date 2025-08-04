'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const discoveryMock = jest.fn();
const authorizationCodeGrantMock = jest.fn();
const fetchUserInfoMock = jest.fn();
jest.mock('openid-client', () => ({
	...jest.requireActual('openid-client'),
	discovery: discoveryMock,
	authorizationCodeGrant: authorizationCodeGrantMock,
	fetchUserInfo: fetchUserInfoMock,
}));
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const real_odic_client = jest.requireActual('openid-client');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const constants_1 = require('@/sso.ee/oidc/constants');
const oidc_service_ee_1 = require('@/sso.ee/oidc/oidc.service.ee');
const users_1 = require('@test-integration/db/users');
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('OIDC service', () => {
	let oidcService;
	let userRepository;
	let createdUser;
	beforeAll(async () => {
		oidcService = di_1.Container.get(oidc_service_ee_1.OidcService);
		userRepository = di_1.Container.get(db_1.UserRepository);
		await oidcService.init();
		await (0, users_1.createUser)({
			email: 'user1@example.com',
		});
	});
	describe('loadConfig', () => {
		it('should initialize with default config', () => {
			expect(oidcService.getRedactedConfig()).toEqual({
				clientId: '',
				clientSecret: constants_1.OIDC_CLIENT_SECRET_REDACTED_VALUE,
				discoveryEndpoint: 'http://n8n.io/not-set',
				loginEnabled: false,
			});
		});
		it('should fallback to default configuration', async () => {
			const config = await oidcService.loadConfig();
			expect(config).toEqual({
				clientId: '',
				clientSecret: '',
				discoveryEndpoint: new URL('http://n8n.io/not-set'),
				loginEnabled: false,
			});
		});
		it('should load and update OIDC configuration', async () => {
			const newConfig = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};
			await oidcService.updateConfig(newConfig);
			const loadedConfig = await oidcService.loadConfig();
			expect(loadedConfig.clientId).toEqual('test-client-id');
			expect(loadedConfig.clientSecret).not.toEqual('test-client-secret');
			expect(loadedConfig.discoveryEndpoint.toString()).toEqual(
				'https://example.com/.well-known/openid-configuration',
			);
			expect(loadedConfig.loginEnabled).toBe(true);
		});
		it('should load and decrypt OIDC configuration', async () => {
			const newConfig = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};
			await oidcService.updateConfig(newConfig);
			const loadedConfig = await oidcService.loadConfig(true);
			expect(loadedConfig.clientId).toEqual('test-client-id');
			expect(loadedConfig.clientSecret).toEqual('test-client-secret');
			expect(loadedConfig.discoveryEndpoint.toString()).toEqual(
				'https://example.com/.well-known/openid-configuration',
			);
			expect(loadedConfig.loginEnabled).toBe(true);
		});
		it('should throw an error if the discovery endpoint is invalid', async () => {
			const newConfig = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'Not an url',
				loginEnabled: true,
			};
			await expect(oidcService.updateConfig(newConfig)).rejects.toThrowError(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should keep current secret if redact value is given in update', async () => {
			const newConfig = {
				clientId: 'test-client-id',
				clientSecret: constants_1.OIDC_CLIENT_SECRET_REDACTED_VALUE,
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};
			await oidcService.updateConfig(newConfig);
			const loadedConfig = await oidcService.loadConfig(true);
			expect(loadedConfig.clientId).toEqual('test-client-id');
			expect(loadedConfig.clientSecret).toEqual('test-client-secret');
			expect(loadedConfig.discoveryEndpoint.toString()).toEqual(
				'https://example.com/.well-known/openid-configuration',
			);
			expect(loadedConfig.loginEnabled).toBe(true);
		});
	});
	it('should generate a valid callback URL', () => {
		const callbackUrl = oidcService.getCallbackUrl();
		expect(callbackUrl).toContain('/sso/oidc/callback');
	});
	it('should generate a valid authentication URL', async () => {
		const mockConfiguration = new real_odic_client.Configuration(
			{
				issuer: 'https://example.com/auth/realms/n8n',
				client_id: 'test-client-id',
				redirect_uris: ['http://n8n.io/sso/oidc/callback'],
				response_types: ['code'],
				scopes: ['openid', 'profile', 'email'],
				authorization_endpoint: 'https://example.com/auth',
			},
			'test-client-id',
		);
		discoveryMock.mockResolvedValue(mockConfiguration);
		const authUrl = await oidcService.generateLoginUrl();
		expect(authUrl.pathname).toEqual('/auth');
		expect(authUrl.searchParams.get('client_id')).toEqual('test-client-id');
		expect(authUrl.searchParams.get('redirect_uri')).toEqual(
			'http://localhost:5678/rest/sso/oidc/callback',
		);
		expect(authUrl.searchParams.get('response_type')).toEqual('code');
		expect(authUrl.searchParams.get('scope')).toEqual('openid email profile');
	});
	describe('loginUser', () => {
		it('should handle new user login with valid callback URL', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token',
				id_token: 'mock-id-token',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					};
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
				email: 'user2@example.com',
			});
			const user = await oidcService.loginUser(callbackUrl);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user2@example.com');
			createdUser = user;
			const userFromDB = await userRepository.findOne({
				where: { email: 'user2@example.com' },
			});
			expect(userFromDB).toBeDefined();
			expect(userFromDB.id).toEqual(user.id);
		});
		it('should handle existing user login with valid callback URL', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token-1',
				id_token: 'mock-id-token-1',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					};
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
				email: 'user2@example.com',
			});
			const user = await oidcService.loginUser(callbackUrl);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user2@example.com');
			expect(user.id).toEqual(createdUser.id);
		});
		it('should sign up the user if user already exists out of OIDC system', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token-2',
				id_token: 'mock-id-token-2',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-1',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					};
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
				email: 'user1@example.com',
			});
			const user = await oidcService.loginUser(callbackUrl);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user1@example.com');
		});
		it('should sign in user if OIDC Idp does not have email verified', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token-2',
				id_token: 'mock-id-token-2',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-3',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					};
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: false,
				email: 'user3@example.com',
			});
			const user = await oidcService.loginUser(callbackUrl);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user3@example.com');
		});
		it('should throw `BadRequestError` if OIDC Idp does not provide an email', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token-2',
				id_token: 'mock-id-token-2',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-3',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					};
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
			});
			await expect(oidcService.loginUser(callbackUrl)).rejects.toThrowError(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should throw `ForbiddenError` if OIDC token does not provide claims', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);
			const mockTokens = {
				access_token: 'mock-access-token-2',
				id_token: 'mock-id-token-2',
				token_type: 'bearer',
				claims: () => {
					return undefined;
				},
				expiresIn: () => 3600,
			};
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
			});
			await expect(oidcService.loginUser(callbackUrl)).rejects.toThrowError(
				forbidden_error_1.ForbiddenError,
			);
		});
	});
});
//# sourceMappingURL=oidc.service.ee.test.js.map
