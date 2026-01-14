import type { OidcConfigDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { AuthIdentityRepository, SettingsRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Cipher, InstanceSettings } from 'n8n-core';
import * as client from 'openid-client';
import { EnvHttpProxyAgent } from 'undici';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { type ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';
import * as ssoHelpers from '@/sso.ee/sso-helpers';

import { OIDC_PREFERENCES_DB_KEY } from '../constants';
import { OidcService } from '../oidc.service.ee';

jest.mock('undici', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	EnvHttpProxyAgent: jest.fn().mockImplementation(() => ({})),
}));

describe('OidcService', () => {
	let oidcService: OidcService;
	let settingsRepository: SettingsRepository;
	let globalConfig: GlobalConfig;
	let instanceSettings: InstanceSettings;
	let cipher: Cipher;
	let logger: Logger;
	let jwtService: JwtService;
	let provisioningService: ProvisioningService;
	let userRepository: UserRepository;
	let authIdentityRepository: AuthIdentityRepository;

	const mockOidcConfig = {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		discoveryEndpoint: 'https://example.com/.well-known/openid_configuration',
		scope: 'openid profile email',
		loginEnabled: true,
		loginLabel: 'Login with OIDC',
		loginButtonColor: '#1f2937',
	};

	const mockConfigFromDB = {
		key: OIDC_PREFERENCES_DB_KEY,
		value: JSON.stringify(mockOidcConfig),
		loadOnStartup: true,
	};

	beforeEach(async () => {
		jest.resetAllMocks();
		Container.reset();

		settingsRepository = mock<SettingsRepository>();
		globalConfig = mock<GlobalConfig>({
			sso: { oidc: { loginEnabled: false } },
		});
		instanceSettings = mock<InstanceSettings>({
			isMultiMain: true,
		});
		cipher = mock<Cipher>();
		logger = mockLogger();
		jwtService = mock<JwtService>();
		provisioningService = mock<ProvisioningService>();
		userRepository = mock<UserRepository>();
		authIdentityRepository = mock<AuthIdentityRepository>();
		jest
			.spyOn(ssoHelpers, 'setCurrentAuthenticationMethod')
			.mockImplementation(async () => await Promise.resolve());

		oidcService = new OidcService(
			settingsRepository,
			authIdentityRepository,
			mock<UrlService>(),
			globalConfig,
			userRepository,
			cipher,
			logger,
			jwtService,
			instanceSettings,
			provisioningService,
		);

		await oidcService.init();
	});

	describe('reload', () => {
		it('should reload OIDC configuration from database', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue(mockConfigFromDB);

			// Mock the discovery endpoint response
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => {
					return await Promise.resolve({
						issuer: 'https://example.com',
						authorization_endpoint: 'https://example.com/auth',
						token_endpoint: 'https://example.com/token',
						userinfo_endpoint: 'https://example.com/userinfo',
						jwks_uri: 'https://example.com/jwks',
					});
				},
			});

			await oidcService.reload();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(OIDC_PREFERENCES_DB_KEY);
			expect(logger.debug).toHaveBeenCalledWith(
				'OIDC configuration changed, starting to load it from the database',
			);
		});

		it('should handle reload when no config exists in database', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue(null);

			await oidcService.reload();

			expect(logger.warn).toHaveBeenCalledWith(
				'OIDC configuration not found in database, ignoring reload message',
			);
		});

		it('should handle errors during reload', async () => {
			const error = new Error('Database error');
			settingsRepository.findByKey = jest.fn().mockRejectedValue(error);

			await oidcService.reload();

			expect(logger.error).toHaveBeenCalledWith(
				'OIDC configuration changed, failed to reload OIDC configuration',
				{ error },
			);
		});
	});

	describe('loadConfigurationFromDatabase', () => {
		it('should return undefined for empty discovery endpoint', async () => {
			const configWithEmptyEndpoint = {
				...mockOidcConfig,
				discoveryEndpoint: '',
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(configWithEmptyEndpoint),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toBeUndefined();
		});

		it('should handle invalid JSON in database', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: 'invalid json',
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load OIDC configuration from database, falling back to default configuration.',
				expect.any(Object),
			);
		});

		it('should fill out optional prompt parameter with default value', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(mockOidcConfig),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toEqual({
				clientId: mockOidcConfig.clientId,
				clientSecret: mockOidcConfig.clientSecret,
				loginEnabled: mockOidcConfig.loginEnabled,
				prompt: 'select_account',
				discoveryEndpoint: expect.any(URL),
				authenticationContextClassReference: expect.any(Array),
			});
		});

		it('should fill out optional authenticationContextClassReference parameter with default value', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(mockOidcConfig),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toEqual({
				clientId: mockOidcConfig.clientId,
				clientSecret: mockOidcConfig.clientSecret,
				loginEnabled: mockOidcConfig.loginEnabled,
				prompt: 'select_account',
				discoveryEndpoint: expect.any(URL),
				authenticationContextClassReference: [],
			});
		});

		it('should decrypt client secret when requested', async () => {
			const encryptedSecret = 'encrypted-secret';
			const decryptedSecret = 'decrypted-secret';

			cipher.decrypt = jest.fn().mockReturnValue(decryptedSecret);

			const configWithEncryptedSecret = {
				...mockOidcConfig,
				clientSecret: encryptedSecret,
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(configWithEncryptedSecret),
				loadOnStartup: true,
			});

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => {
					return await Promise.resolve({
						issuer: 'https://example.com',
						authorization_endpoint: 'https://example.com/auth',
						token_endpoint: 'https://example.com/token',
						userinfo_endpoint: 'https://example.com/userinfo',
						jwks_uri: 'https://example.com/jwks',
					});
				},
			});

			const result = await oidcService.loadConfigurationFromDatabase(true);

			expect(cipher.decrypt).toHaveBeenCalledWith(encryptedSecret);
			expect(result?.clientSecret).toBe(decryptedSecret);
		});

		it('should not issue warnings for default config with empty discoveryEndpoint', async () => {
			const defaultConfig = {
				...mockOidcConfig,
				discoveryEndpoint: '',
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(defaultConfig),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toBeUndefined();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should issue warnings when Zod validation fails', async () => {
			const invalidConfig = {
				...mockOidcConfig,
				discoveryEndpoint: 'not-a-valid-url',
			};

			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(invalidConfig),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load OIDC configuration from database, falling back to default configuration.',
				expect.any(Object),
			);
		});

		it('should not issue warnings for valid complete configuration', async () => {
			settingsRepository.findByKey = jest.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(mockOidcConfig),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toEqual({
				clientId: mockOidcConfig.clientId,
				clientSecret: mockOidcConfig.clientSecret,
				loginEnabled: mockOidcConfig.loginEnabled,
				prompt: 'select_account',
				discoveryEndpoint: expect.any(URL),
				authenticationContextClassReference: expect.any(Array),
			});
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('broadcastReloadOIDCConfigurationCommand', () => {
		const mockPublisher = { publishCommand: jest.fn() };
		beforeEach(() => {
			mockInstance(Publisher, mockPublisher);
		});

		it('should publish reload command in multi-main setup', async () => {
			(instanceSettings as any).isMultiMain = true;
			// Trigger broadcast by updating config
			settingsRepository.save = jest.fn().mockResolvedValue(mockConfigFromDB);
			settingsRepository.findByKey = jest.fn().mockResolvedValue(mockConfigFromDB);
			jest.spyOn(client, 'discovery').mockResolvedValue({} as client.Configuration);

			await oidcService.updateConfig(mockOidcConfig as any as OidcConfigDto);

			// In multi-main setup, should attempt to publish
			expect(mockPublisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-oidc-config',
			});
		});

		it('should not publish in single main setup', async () => {
			(instanceSettings as any).isMultiMain = false;

			settingsRepository.update = jest.fn().mockResolvedValue(mockConfigFromDB);
			settingsRepository.findByKey = jest.fn().mockResolvedValue(mockConfigFromDB);
			jest.spyOn(client, 'discovery').mockResolvedValue({} as client.Configuration);

			await oidcService.updateConfig(mockOidcConfig as any as OidcConfigDto);

			// Should not attempt to import Publisher in single main setup
			expect(mockPublisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('loginUser', () => {
		it('throws an error if authorizationCodeGrant throws an error', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest
				.spyOn(client, 'authorizationCodeGrant')
				.mockRejectedValue(new Error('Authorization code grant failed'));

			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new BadRequestError('Invalid authorization code'),
			);
		});

		it('throws an error if claims() throws an error', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					throw new Error('Claims extraction failed');
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new BadRequestError('Invalid token'),
			);
		});

		it('should throw an error if there are no claims', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return undefined;
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new ForbiddenError('No claims found in the OIDC token'),
			);
		});

		it('throws an error if fetchUserInfo throws an error', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest.spyOn(client, 'fetchUserInfo').mockRejectedValue(new Error('Fetch user info failed'));
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new BadRequestError('Invalid token'),
			);
		});

		it('throws an error if there is no email', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest.spyOn(client, 'fetchUserInfo').mockResolvedValue({ email_verified: true } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new BadRequestError('An email is required'),
			);
		});

		it('throws an error if the email is invalid', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest
				.spyOn(client, 'fetchUserInfo')
				.mockResolvedValue({ email_verified: true, email: 'invalid-email' } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				new BadRequestError('Invalid email format'),
			);
		});

		it('should return the user if the auth identity already exists', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = jest.fn().mockResolvedValue(undefined);
			authIdentityRepository.findOne = jest
				.fn()
				.mockResolvedValue({ user: { email: 'john.doe@test.com' } as any });

			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest
				.spyOn(client, 'fetchUserInfo')
				.mockResolvedValue({ email_verified: true, email: 'john.doe@test.com' } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			expect(oidcService.applySsoProvisioning).toHaveBeenCalledWith(user, { sub: 'valid-subject' });
		});

		it('should return a user if the user exists but the auth identity does not', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = jest.fn().mockResolvedValue(undefined);
			userRepository.findOne = jest.fn().mockResolvedValue({ email: 'john.doe@test.com' } as any);

			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest
				.spyOn(client, 'fetchUserInfo')
				.mockResolvedValue({ email_verified: true, email: 'john.doe@test.com' } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			expect(oidcService.applySsoProvisioning).toHaveBeenCalledWith(user, { sub: 'valid-subject' });
		});

		it('should create a new user if the user does not exist', async () => {
			oidcService.verifyState = jest.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = jest.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = jest.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = jest.fn().mockResolvedValue(undefined);
			userRepository.manager.transaction = jest
				.fn()
				.mockResolvedValue({ email: 'john.doe@test.com' } as any);

			jest.spyOn(client, 'authorizationCodeGrant').mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			jest
				.spyOn(client, 'fetchUserInfo')
				.mockResolvedValue({ email_verified: true, email: 'john.doe@test.com' } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
		});
	});

	describe('proxy configuration', () => {
		const originalEnv = process.env;

		// Helper function to create a proper mock Response
		const createMockResponse = () => {
			const mockData = {
				issuer: 'https://example.com',
				authorization_endpoint: 'https://example.com/auth',
				token_endpoint: 'https://example.com/token',
				userinfo_endpoint: 'https://example.com/userinfo',
				jwks_uri: 'https://example.com/jwks',
			};
			return new Response(JSON.stringify(mockData), {
				status: 200,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { 'content-type': 'application/json' },
			});
		};

		beforeEach(() => {
			// Reset environment before each test
			process.env = { ...originalEnv };
			// Reset the mock between tests
			(EnvHttpProxyAgent as unknown as jest.Mock).mockClear();
		});

		afterEach(() => {
			// Restore original environment after each test
			process.env = originalEnv;
		});

		it.each([
			{ envVar: 'HTTP_PROXY', value: 'http://proxy.example.com:8080' },
			{ envVar: 'HTTPS_PROXY', value: 'https://proxy.example.com:8443' },
			{ envVar: 'ALL_PROXY', value: 'http://all-proxy.example.com:8888' },
		])('should instantiate EnvHttpProxyAgent when $envVar is set', async ({ envVar, value }) => {
			// Set proxy environment variable
			process.env[envVar] = value;

			const discoveryUrl = new URL('https://example.com/.well-known/openid-configuration');
			const clientId = 'test-client';
			const clientSecret = 'test-secret';

			global.fetch = jest.fn().mockResolvedValue(createMockResponse());

			// Call the private method directly using type assertion
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await (oidcService as any).createProxyAwareConfiguration(
				discoveryUrl,
				clientId,
				clientSecret,
			);

			// Verify EnvHttpProxyAgent was instantiated
			expect(EnvHttpProxyAgent).toHaveBeenCalled();
		});

		it('should not instantiate EnvHttpProxyAgent when no proxy env vars are set', async () => {
			// Ensure no proxy env vars are set
			delete process.env.HTTP_PROXY;
			delete process.env.HTTPS_PROXY;
			delete process.env.ALL_PROXY;

			const discoveryUrl = new URL('https://example.com/.well-known/openid-configuration');
			const clientId = 'test-client';
			const clientSecret = 'test-secret';

			global.fetch = jest.fn().mockResolvedValue(createMockResponse());

			// Call the private method directly
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await (oidcService as any).createProxyAwareConfiguration(
				discoveryUrl,
				clientId,
				clientSecret,
			);

			// Should not instantiate EnvHttpProxyAgent when no proxy is configured
			expect(EnvHttpProxyAgent).not.toHaveBeenCalled();
		});
	});
});
