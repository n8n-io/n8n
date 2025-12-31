const discoveryMock = jest.fn();
const authorizationCodeGrantMock = jest.fn();
const fetchUserInfoMock = jest.fn();

jest.mock('openid-client', () => ({
	...jest.requireActual('openid-client'),
	discovery: discoveryMock,
	authorizationCodeGrant: authorizationCodeGrantMock,
	fetchUserInfo: fetchUserInfoMock,
}));

import type { OidcConfigDto } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';
import { type User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type * as mocked_oidc_client from 'openid-client';
const real_odic_client = jest.requireActual('openid-client');

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '@/sso.ee/oidc/constants';
import { OidcService } from '@/sso.ee/oidc/oidc.service.ee';
import { createUser } from '@test-integration/db/users';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('OIDC service', () => {
	let oidcService: OidcService;
	let userRepository: UserRepository;
	let createdUser: User;

	beforeAll(async () => {
		oidcService = Container.get(OidcService);
		userRepository = Container.get(UserRepository);
		await oidcService.init();

		await createUser({
			email: 'user1@example.com',
		});
	});

	describe('loadConfig', () => {
		it('should initialize with default config', () => {
			expect(oidcService.getRedactedConfig()).toEqual({
				clientId: '',
				clientSecret: OIDC_CLIENT_SECRET_REDACTED_VALUE,
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
			const newConfig: OidcConfigDto = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			await oidcService.updateConfig(newConfig);
			const loadedConfig = await oidcService.loadConfig();

			expect(loadedConfig.clientId).toEqual('test-client-id');
			// The secret should be encrypted and not match the original value
			expect(loadedConfig.clientSecret).not.toEqual('test-client-secret');
			expect(loadedConfig.discoveryEndpoint.toString()).toEqual(
				'https://example.com/.well-known/openid-configuration',
			);
			expect(loadedConfig.loginEnabled).toBe(true);
		});

		it('should load and decrypt OIDC configuration', async () => {
			const newConfig: OidcConfigDto = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			await oidcService.updateConfig(newConfig);
			const loadedConfig = await oidcService.loadConfig(true);

			expect(loadedConfig.clientId).toEqual('test-client-id');
			// The secret should be encrypted and not match the original value
			expect(loadedConfig.clientSecret).toEqual('test-client-secret');
			expect(loadedConfig.discoveryEndpoint.toString()).toEqual(
				'https://example.com/.well-known/openid-configuration',
			);
			expect(loadedConfig.loginEnabled).toBe(true);
		});

		it('should throw an error if the discovery endpoint is invalid', async () => {
			const newConfig: OidcConfigDto = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'Not an url',
				loginEnabled: true,
			};

			await expect(oidcService.updateConfig(newConfig)).rejects.toThrowError(BadRequestError);
		});

		it('should keep current secret if redact value is given in update', async () => {
			const newConfig: OidcConfigDto = {
				clientId: 'test-client-id',
				clientSecret: OIDC_CLIENT_SECRET_REDACTED_VALUE,
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			await oidcService.updateConfig(newConfig);

			const loadedConfig = await oidcService.loadConfig(true);

			expect(loadedConfig.clientId).toEqual('test-client-id');
			// The secret should be encrypted and not match the original value
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

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
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
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

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
			expect(userFromDB!.id).toEqual(user.id);
		});

		it('should handle existing user login with valid callback URL', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
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
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

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

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
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
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			// Simulate that the user already exists in the database
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

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
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
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			// Simulate that the user already exists in the database
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

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
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
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			// Simulate that the user already exists in the database
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
			});

			await expect(oidcService.loginUser(callbackUrl)).rejects.toThrowError(BadRequestError);
		});

		it('should throw `ForbiddenError` if OIDC token does not provide claims', async () => {
			const callbackUrl = new URL(
				'http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=valid-state',
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
				access_token: 'mock-access-token-2',
				id_token: 'mock-id-token-2',
				token_type: 'bearer',
				claims: () => {
					return undefined; // Simulating no claims
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			// Simulate that the user already exists in the database
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
			});

			await expect(oidcService.loginUser(callbackUrl)).rejects.toThrowError(ForbiddenError);
		});
	});
});
