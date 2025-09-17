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
import { UserError } from 'n8n-workflow';
import { JwtService } from '@/services/jwt.service';

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

			await expect(oidcService.updateConfig(newConfig)).rejects.toThrowError(UserError);
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

		it('should throw UserError when OIDC discovery fails during updateConfig', async () => {
			const newConfig: OidcConfigDto = {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			discoveryMock.mockRejectedValueOnce(new Error('Discovery failed'));

			await expect(oidcService.updateConfig(newConfig)).rejects.toThrowError(UserError);
			expect(discoveryMock).toHaveBeenCalledWith(
				expect.any(URL),
				'test-client-id',
				'test-client-secret',
			);
		});

		it('should invalidate cached configuration when updateConfig is called', async () => {
			// First, set up a working configuration
			const initialConfig: OidcConfigDto = {
				clientId: 'initial-client-id',
				clientSecret: 'initial-client-secret',
				discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			const mockConfiguration = new real_odic_client.Configuration(
				{
					issuer: 'https://example.com/auth/realms/n8n',
					client_id: 'initial-client-id',
					redirect_uris: ['http://n8n.io/sso/oidc/callback'],
					response_types: ['code'],
					scopes: ['openid', 'profile', 'email'],
					authorization_endpoint: 'https://example.com/auth',
				},
				'initial-client-id',
			);

			discoveryMock.mockReset();
			discoveryMock.mockClear();
			discoveryMock.mockResolvedValue(mockConfiguration);
			await oidcService.updateConfig(initialConfig);

			// Generate a login URL to populate the cache
			await oidcService.generateLoginUrl();
			expect(discoveryMock).toHaveBeenCalledTimes(2); // Once in updateConfig, once in generateLoginUrl

			// Update config with new values
			const newConfig: OidcConfigDto = {
				clientId: 'new-client-id',
				clientSecret: 'new-client-secret',
				discoveryEndpoint: 'https://newprovider.example.com/.well-known/openid-configuration',
				loginEnabled: true,
			};

			const newMockConfiguration = new real_odic_client.Configuration(
				{
					issuer: 'https://newprovider.example.com/auth/realms/n8n',
					client_id: 'new-client-id',
					redirect_uris: ['http://n8n.io/sso/oidc/callback'],
					response_types: ['code'],
					scopes: ['openid', 'profile', 'email'],
					authorization_endpoint: 'https://newprovider.example.com/auth',
				},
				'new-client-id',
			);

			discoveryMock.mockResolvedValue(newMockConfiguration);
			await oidcService.updateConfig(newConfig);

			// Generate login URL again - should use new configuration
			const authUrl = await oidcService.generateLoginUrl();
			expect(authUrl.url.pathname).toEqual('/auth');
			expect(authUrl.url.searchParams.get('client_id')).toEqual('new-client-id');

			// Verify discovery was called again due to cache invalidation
			expect(discoveryMock).toHaveBeenCalledTimes(4); // Initial config, initial login, new config, new login
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

		const initialConfig: OidcConfigDto = {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			discoveryEndpoint: 'https://example.com/.well-known/openid-configuration',
			loginEnabled: true,
		};

		await oidcService.updateConfig(initialConfig);

		const authUrl = await oidcService.generateLoginUrl();

		expect(authUrl.url.pathname).toEqual('/auth');
		expect(authUrl.url.searchParams.get('client_id')).toEqual('test-client-id');
		expect(authUrl.url.searchParams.get('redirect_uri')).toEqual(
			'http://localhost:5678/rest/sso/oidc/callback',
		);
		expect(authUrl.url.searchParams.get('response_type')).toEqual('code');
		expect(authUrl.url.searchParams.get('scope')).toEqual('openid email profile');
		expect(authUrl.url.searchParams.get('state')).toBeDefined();
		expect(authUrl.url.searchParams.get('state')?.startsWith('n8n_state:')).toBe(true);

		expect(authUrl.state).toBeDefined();
		expect(authUrl.nonce).toBeDefined();
	});

	describe('loginUser', () => {
		it('should handle new user login with valid callback URL', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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

			const user = await oidcService.loginUser(callbackUrl, state.signed, nonce.signed);
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
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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
			state;
			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
				email: 'user2@example.com',
			});

			const user = await oidcService.loginUser(callbackUrl, state.signed, nonce.signed);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user2@example.com');
			expect(user.id).toEqual(createdUser.id);
		});

		it('should sign up the user if user already exists out of OIDC system', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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

			const user = await oidcService.loginUser(callbackUrl, state.signed, nonce.signed);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user1@example.com');
		});

		it('should sign in user if OIDC Idp does not have email verified', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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

			const user = await oidcService.loginUser(callbackUrl, state.signed, nonce.signed);
			expect(user).toBeDefined();
			expect(user.email).toEqual('user3@example.com');
		});

		it('should throw `BadRequestError` if OIDC Idp does not provide an email', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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

			await expect(
				oidcService.loginUser(callbackUrl, state.signed, nonce.signed),
			).rejects.toThrowError(BadRequestError);
		});

		it('should throw `BadRequestError` if OIDC Idp provides an invalid email format', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
				access_token: 'mock-access-token-invalid',
				id_token: 'mock-id-token-invalid',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-invalid',
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

			// Provide an invalid email format
			fetchUserInfoMock.mockResolvedValueOnce({
				email_verified: true,
				email: 'invalid-email-format',
			});

			const error = await oidcService
				.loginUser(callbackUrl, state.signed, nonce.signed)
				.catch((e) => e);
			expect(error.message).toBe('Invalid email format');
		});

		it.each([
			['not-an-email'],
			['@missinglocal.com'],
			['missing@.com'],
			['spaces in@email.com'],
			['double@@domain.com'],
		])('should throw `BadRequestError` for invalid email <%s>', async (invalidEmail) => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
				access_token: 'mock-access-token-multi',
				id_token: 'mock-id-token-multi',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-multi',
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
				email: invalidEmail,
			});

			await expect(
				oidcService.loginUser(callbackUrl, state.signed, nonce.signed),
			).rejects.toThrowError(BadRequestError);
		});

		it('should throw `ForbiddenError` if OIDC token does not provide claims', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
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

			await expect(
				oidcService.loginUser(callbackUrl, state.signed, nonce.signed),
			).rejects.toThrowError(ForbiddenError);
		});

		it('should throw `BadRequestError` with "Invalid authorization code" when authorizationCodeGrant fails', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=invalid-code&state=${state.plaintext}`,
			);

			// Mock authorizationCodeGrant to throw an error
			authorizationCodeGrantMock.mockRejectedValueOnce(
				new Error('Authorization code exchange failed'),
			);

			const error = await oidcService
				.loginUser(callbackUrl, state.signed, nonce.signed)
				.catch((e) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toBe('Invalid authorization code');
			expect(authorizationCodeGrantMock).toHaveBeenCalledWith(
				expect.any(Object), // configuration
				callbackUrl,
				{
					expectedState: state.plaintext,
					expectedNonce: nonce.plaintext,
				},
			);
		});

		it('should throw `BadRequestError` with "Invalid token" when tokens.claims() fails', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
				access_token: 'mock-access-token-claims-error',
				id_token: 'mock-id-token-claims-error',
				token_type: 'bearer',
				claims: (() => {
					throw new Error('Failed to extract claims');
				}) as any,
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			const error = await oidcService
				.loginUser(callbackUrl, state.signed, nonce.signed)
				.catch((e) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toBe('Invalid token');
		});

		it('should throw `BadRequestError` with "Invalid token" when fetchUserInfo fails', async () => {
			const state = oidcService.generateState();
			const nonce = oidcService.generateNonce();
			const callbackUrl = new URL(
				`http://localhost:5678/rest/sso/oidc/callback?code=valid-code&state=${state.plaintext}`,
			);

			const mockTokens: mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers = {
				access_token: 'mock-access-token-userinfo-error',
				id_token: 'mock-id-token-userinfo-error',
				token_type: 'bearer',
				claims: () => {
					return {
						sub: 'mock-subject-userinfo-error',
						iss: 'https://example.com/auth/realms/n8n',
						aud: 'test-client-id',
						iat: Math.floor(Date.now() / 1000) - 1000,
						exp: Math.floor(Date.now() / 1000) + 3600,
					} as mocked_oidc_client.IDToken;
				},
				expiresIn: () => 3600,
			} as mocked_oidc_client.TokenEndpointResponse &
				mocked_oidc_client.TokenEndpointResponseHelpers;

			// Reset and setup mocks in the right order
			authorizationCodeGrantMock.mockReset();
			fetchUserInfoMock.mockReset();

			authorizationCodeGrantMock.mockResolvedValueOnce(mockTokens);

			// Mock fetchUserInfo to throw an error
			fetchUserInfoMock.mockRejectedValueOnce(new Error('Failed to fetch user info'));

			const error = await oidcService
				.loginUser(callbackUrl, state.signed, nonce.signed)
				.catch((e) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error.message).toBe('Invalid token');
			expect(fetchUserInfoMock).toHaveBeenCalledWith(
				expect.any(Object), // configuration
				'mock-access-token-userinfo-error',
				'mock-subject-userinfo-error',
			);
		});
	});

	describe('State and nonce', () => {
		it('should generate and verify a valid state', () => {
			const state = oidcService.generateState();
			const decoded = oidcService.verifyState(state.signed);
			expect(decoded).toBe(state.plaintext);
		});

		it('should generate and verify a valid nonce', () => {
			const nonce = oidcService.generateNonce();
			const decoded = oidcService.verifyNonce(nonce.signed);
			expect(decoded).toBe(nonce.plaintext);
		});

		it('should throw an error for an invalid state', () => {
			expect(() => oidcService.verifyState('invalid_state')).toThrow(BadRequestError);
		});

		it('should throw an error for an invalid formatted state', () => {
			const invalid = Container.get(JwtService).sign({ state: 'invalid_state' });
			expect(() => oidcService.verifyState(invalid)).toThrow(BadRequestError);
		});

		it('should throw an error for an invalid random part of the state', () => {
			const invalid = Container.get(JwtService).sign({ state: 'n8n_state:invalid-state' });
			expect(() => oidcService.verifyState(invalid)).toThrow(BadRequestError);
		});

		it('should throw an error for an invalid nonce', () => {
			expect(() => oidcService.verifyNonce('invalid_nonce')).toThrow(BadRequestError);
		});

		it('should throw an error for an invalid formatted nonce', () => {
			const invalid = Container.get(JwtService).sign({ nonce: 'invalid_nonce' });
			expect(() => oidcService.verifyNonce(invalid)).toThrow(BadRequestError);
		});

		it('should throw an error for an invalid random part of the nonce', () => {
			const invalid = Container.get(JwtService).sign({ nonce: 'n8n_nonce:invalid-nonce' });
			expect(() => oidcService.verifyNonce(invalid)).toThrow(BadRequestError);
		});
	});
});
