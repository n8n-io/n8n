import type { Mock, Mocked } from 'vitest';
import type { OidcConfigDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { HttpTransport, SsrfProtectionService } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { type LocalServer, startServer } from '@n8n/backend-network/testing';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { AuthIdentityRepository, SettingsRepository, User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import type { Cipher, InstanceSettings } from 'n8n-core';
import * as client from 'openid-client';

vi.mock('openid-client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('openid-client')>();
	return {
		...actual,
		discovery: vi.fn(),
		authorizationCodeGrant: vi.fn(),
		fetchUserInfo: vi.fn(),
	};
});

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { type ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';
import * as ssoHelpers from '@/sso.ee/sso-helpers';

import { OIDC_PREFERENCES_DB_KEY } from '../constants';
import { OidcService } from '../oidc.service.ee';

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
	let outboundHttp: Mocked<OutboundHttp>;
	let customFetch: Mock;

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
		vi.resetAllMocks();
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
		customFetch = vi.fn();
		outboundHttp = mock<OutboundHttp>();
		outboundHttp.transport.mockReturnValue(
			mock<HttpTransport>({ asCustomFetch: () => customFetch }),
		);
		vi.spyOn(ssoHelpers, 'setCurrentAuthenticationMethod').mockImplementation(
			async () => await Promise.resolve(),
		);

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
			outboundHttp,
		);

		await oidcService.init();
	});

	describe('reload', () => {
		it('should reload OIDC configuration from database', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue(mockConfigFromDB);

			// Mock the discovery endpoint response
			global.fetch = vi.fn().mockResolvedValue({
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
			settingsRepository.findByKey = vi.fn().mockResolvedValue(null);

			await oidcService.reload();

			expect(logger.warn).toHaveBeenCalledWith(
				'OIDC configuration not found in database, ignoring reload message',
			);
		});

		it('should handle errors during reload', async () => {
			const error = new Error('Database error');
			settingsRepository.findByKey = vi.fn().mockRejectedValue(error);

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

			settingsRepository.findByKey = vi.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(configWithEmptyEndpoint),
				loadOnStartup: true,
			});

			const result = await oidcService.loadConfigurationFromDatabase();

			expect(result).toBeUndefined();
		});

		it('should handle invalid JSON in database', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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
			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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
				additionalScopes: '',
			});
		});

		it('should fill out optional authenticationContextClassReference parameter with default value', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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
				additionalScopes: '',
			});
		});

		it('should decrypt client secret when requested', async () => {
			const encryptedSecret = 'encrypted-secret';
			const decryptedSecret = 'decrypted-secret';

			cipher.decryptV2 = vi.fn().mockResolvedValue(decryptedSecret);

			const configWithEncryptedSecret = {
				...mockOidcConfig,
				clientSecret: encryptedSecret,
			};

			settingsRepository.findByKey = vi.fn().mockResolvedValue({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(configWithEncryptedSecret),
				loadOnStartup: true,
			});

			global.fetch = vi.fn().mockResolvedValue({
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

			expect(cipher.decryptV2).toHaveBeenCalledWith(encryptedSecret);
			expect(result?.clientSecret).toBe(decryptedSecret);
		});

		it('should not issue warnings for default config with empty discoveryEndpoint', async () => {
			const defaultConfig = {
				...mockOidcConfig,
				discoveryEndpoint: '',
			};

			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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

			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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
			settingsRepository.findByKey = vi.fn().mockResolvedValue({
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
				additionalScopes: '',
			});
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('broadcastReloadOIDCConfigurationCommand', () => {
		const mockPublisher = { publishCommand: vi.fn() };
		beforeEach(() => {
			mockInstance(Publisher, mockPublisher);
		});

		it('should publish reload command in multi-main setup', async () => {
			(instanceSettings as any).isMultiMain = true;
			// Trigger broadcast by updating config
			settingsRepository.save = vi.fn().mockResolvedValue(mockConfigFromDB);
			settingsRepository.findByKey = vi.fn().mockResolvedValue(mockConfigFromDB);
			vi.mocked(client.discovery).mockResolvedValue({} as client.Configuration);

			await oidcService.updateConfig(mockOidcConfig as any as OidcConfigDto);

			// In multi-main setup, should attempt to publish
			expect(mockPublisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-oidc-config',
			});
		});

		it('should not publish in single main setup', async () => {
			(instanceSettings as any).isMultiMain = false;

			settingsRepository.update = vi.fn().mockResolvedValue(mockConfigFromDB);
			settingsRepository.findByKey = vi.fn().mockResolvedValue(mockConfigFromDB);
			vi.mocked(client.discovery).mockResolvedValue({} as client.Configuration);

			await oidcService.updateConfig(mockOidcConfig as any as OidcConfigDto);

			// Should not attempt to import Publisher in single main setup
			expect(mockPublisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('loginUser', () => {
		it('throws an error if authorizationCodeGrant throws an error', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.spyOn(client, 'authorizationCodeGrant').mockRejectedValue(
				new Error('Authorization code grant failed'),
			);

			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Invalid authorization code');
		});

		it('logs token-exchange errors with structured oauth fields', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);

			const tokenError = Object.assign(
				new Error('expected expires_in to be a non-negative number'),
				{
					error: 'invalid_token_response',
					error_description: 'expires_in was zero',
					code: 'OAUTH_INVALID_RESPONSE_BODY',
				},
			);
			vi.mocked(client.authorizationCodeGrant).mockRejectedValue(tokenError);

			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			await expect(oidcService.loginUser(callbackUrl, storedState, storedNonce)).rejects.toThrow(
				'Invalid authorization code',
			);

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to exchange authorization code for tokens',
				expect.objectContaining({
					oauthError: 'invalid_token_response',
					oauthErrorDescription: 'expires_in was zero',
					code: 'OAUTH_INVALID_RESPONSE_BODY',
					message: 'expected expires_in to be a non-negative number',
				}),
			);
		});

		it('throws an error if claims() throws an error', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					throw new Error('Claims extraction failed');
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Invalid token');
		});

		it('should throw an error if there are no claims', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return undefined;
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(ForbiddenError);
			await expect(promise).rejects.toThrow('No claims found in the OIDC token');
		});

		it('throws an error if fetchUserInfo throws an error', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.mocked(client.fetchUserInfo).mockRejectedValue(new Error('Fetch user info failed'));
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Invalid token');
		});

		it('throws an error if there is no email', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.mocked(client.fetchUserInfo).mockResolvedValue({ email_verified: true } as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('An email is required');
		});

		it('throws an error if the email is invalid', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.spyOn(client, 'fetchUserInfo').mockResolvedValue({
				email_verified: true,
				email: 'invalid-email',
			} as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const promise = oidcService.loginUser(callbackUrl, storedState, storedNonce);
			await expect(promise).rejects.toThrow(BadRequestError);
			await expect(promise).rejects.toThrow('Invalid email format');
		});

		it('should return the user if the auth identity already exists', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = vi.fn().mockResolvedValue(undefined);
			authIdentityRepository.findOne = vi
				.fn()
				.mockResolvedValue({ user: { email: 'john.doe@test.com' } as any });

			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.spyOn(client, 'fetchUserInfo').mockResolvedValue({
				email_verified: true,
				email: 'john.doe@test.com',
			} as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			expect(oidcService.applySsoProvisioning).toHaveBeenCalledWith(
				user,
				{ sub: 'valid-subject' },
				{
					email_verified: true,
					email: 'john.doe@test.com',
				},
			);
		});

		it('should return a user if the user exists but the auth identity does not', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = vi.fn().mockResolvedValue(undefined);
			userRepository.findOne = vi.fn().mockResolvedValue({ email: 'john.doe@test.com' } as any);

			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.spyOn(client, 'fetchUserInfo').mockResolvedValue({
				email_verified: true,
				email: 'john.doe@test.com',
			} as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			expect(oidcService.applySsoProvisioning).toHaveBeenCalledWith(
				user,
				{ sub: 'valid-subject' },
				{
					email_verified: true,
					email: 'john.doe@test.com',
				},
			);
		});

		it('should create a new user if the user does not exist', async () => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private and only accessible within class 'OidcService'
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			// @ts-expect-error - applySsoProvisioning is private and only accessible within class 'OidcService'
			oidcService.applySsoProvisioning = vi.fn().mockResolvedValue(undefined);
			userRepository.manager.transaction = vi
				.fn()
				.mockResolvedValue({ email: 'john.doe@test.com' } as any);

			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => {
					return { sub: 'valid-subject' };
				},
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.spyOn(client, 'fetchUserInfo').mockResolvedValue({
				email_verified: true,
				email: 'john.doe@test.com',
			} as any);
			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;

			const user = await oidcService.loginUser(callbackUrl, storedState, storedNonce);
			expect(user).toBeDefined();
			expect(user.email).toEqual('john.doe@test.com');
		});
	});

	describe('applySsoProvisioning', () => {
		const claims = { sub: 'user-123', n8n_instance_role: 'global:member' };
		const userInfo = { email: 'test@example.com', email_verified: true };
		const user = mock<User>({ id: 'user-id' });

		beforeEach(() => {
			oidcService.verifyState = vi.fn().mockReturnValue('valid-state');
			oidcService.verifyNonce = vi.fn().mockReturnValue('valid-nonce');
			// @ts-expect-error - getOidcConfiguration is private
			oidcService.getOidcConfiguration = vi.fn().mockResolvedValue({} as client.Configuration);
			vi.mocked(client.authorizationCodeGrant).mockResolvedValue({
				access_token: 'valid-access-token',
				token_type: 'bearer',
				claims: () => claims,
			} as unknown as client.TokenEndpointResponse & client.TokenEndpointResponseHelpers);
			vi.mocked(client.fetchUserInfo).mockResolvedValue(userInfo as any);
		});

		it('calls provisionExpressionMappedRolesForUser when expression mapping is enabled', async () => {
			provisioningService.isExpressionMappingEnabled = vi.fn().mockResolvedValue(true);
			provisioningService.provisionExpressionMappedRolesForUser = vi
				.fn()
				.mockResolvedValue(undefined);
			authIdentityRepository.findOne = vi.fn().mockResolvedValue({ user });

			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;
			await oidcService.loginUser(callbackUrl, storedState, storedNonce);

			expect(provisioningService.provisionExpressionMappedRolesForUser).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ $provider: 'oidc' }),
			);
			expect(provisioningService.provisionInstanceRoleForUser).not.toHaveBeenCalled();
			expect(provisioningService.provisionProjectRolesForUser).not.toHaveBeenCalled();
		});

		it('falls through to direct-claim provisioning when expression mapping is disabled', async () => {
			provisioningService.isExpressionMappingEnabled = vi.fn().mockResolvedValue(false);
			provisioningService.getConfig = vi.fn().mockResolvedValue({
				scopesInstanceRoleClaimName: 'n8n_instance_role',
				scopesProjectsRolesClaimName: 'n8n_projects',
			});
			provisioningService.provisionInstanceRoleForUser = vi.fn().mockResolvedValue(undefined);
			authIdentityRepository.findOne = vi.fn().mockResolvedValue({ user });

			const callbackUrl = new URL('https://example.com/callback');
			const storedState = oidcService.generateState().signed;
			const storedNonce = oidcService.generateNonce().signed;
			await oidcService.loginUser(callbackUrl, storedState, storedNonce);

			expect(provisioningService.provisionInstanceRoleForUser).toHaveBeenCalledWith(
				user,
				'global:member',
			);
			expect(provisioningService.provisionExpressionMappedRolesForUser).not.toHaveBeenCalled();
		});
	});

	describe('createProxyAwareConfiguration', () => {
		const discoveryUrl = new URL('https://example.com/.well-known/openid-configuration');
		const clientId = 'test-client';
		const clientSecret = 'test-secret';

		const createConfiguration = async () =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
			(await (oidcService as any).createProxyAwareConfiguration(
				discoveryUrl,
				clientId,
				clientSecret,
			)) as client.Configuration;

		it("obtains the custom fetch from the factory transport with SSRF 'disabled'", async () => {
			vi.mocked(client.discovery).mockResolvedValue({} as client.Configuration);

			await createConfiguration();

			// The discovery / token / userinfo endpoints are admin-configured and may
			// legitimately point at an internal IdP, so SSRF protection is disabled.
			expect(outboundHttp.transport).toHaveBeenCalledWith({ ssrf: 'disabled' });
		});

		it('always calls discovery with the factory customFetch (no proxy/no-proxy branch)', async () => {
			const discoverySpy = vi
				.spyOn(client, 'discovery')
				.mockResolvedValue({} as client.Configuration);

			await createConfiguration();

			expect(discoverySpy).toHaveBeenCalledWith(
				discoveryUrl,
				clientId,
				clientSecret,
				undefined,
				expect.objectContaining({
					[client.customFetch]: customFetch,
				}),
			);
		});

		it('sets the factory customFetch on the returned configuration', async () => {
			vi.mocked(client.discovery).mockResolvedValue({} as client.Configuration);

			const result = await createConfiguration();

			expect(result[client.customFetch]).toBe(customFetch);
		});
	});

	// Exercises the customFetch produced by a real OutboundHttp against a real
	// loopback server. openid-client drives discovery / token / userinfo through
	// this fetch, so proving it performs a genuine HTTP round-trip (the same job
	// the old hand-rolled proxyFetch did) validates the migrated behavior.
	describe('factory customFetch (real HTTP round-trip)', () => {
		let idpServer: LocalServer;
		let realOidcService: OidcService;

		beforeAll(async () => {
			idpServer = await startServer((req, res) => {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ ok: true, path: req.url }));
			});
		});

		afterAll(async () => await idpServer.close());

		beforeEach(() => {
			idpServer.clear();
			const realOutboundHttp = new OutboundHttp(mock<SsrfProtectionService>(), logger);
			realOidcService = new OidcService(
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
				realOutboundHttp,
			);
		});

		it('routes openid-client fetches through a real HTTP socket', async () => {
			let factoryFetch: client.CustomFetch | undefined;
			vi.spyOn(client, 'discovery').mockImplementation(
				async (_server, _clientId, _metadata, _auth, options) => {
					factoryFetch = options?.[client.customFetch];
					return {} as client.Configuration;
				},
			);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await (realOidcService as any).createProxyAwareConfiguration(
				new URL('https://issuer.example.com/.well-known/openid-configuration'),
				'real-client',
				'real-secret',
			);

			expect(factoryFetch).toBeDefined();

			const response = await factoryFetch!(`${idpServer.url}/userinfo`, {
				method: 'GET',
				headers: {},
				body: null,
				redirect: 'manual',
			});
			const body = (await response.json()) as { ok: boolean; path: string };

			expect(idpServer.captured).toEqual(['/userinfo']);
			expect(body).toEqual({ ok: true, path: '/userinfo' });
		});
	});
});
