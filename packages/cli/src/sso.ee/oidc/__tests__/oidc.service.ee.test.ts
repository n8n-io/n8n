import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { AuthIdentityRepository, SettingsRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Cipher, InstanceSettings } from 'n8n-core';

import * as client from 'openid-client';

import type { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';

import * as ssoHelpers from '../../sso-helpers';
import { OIDC_PREFERENCES_DB_KEY } from '../constants';
import { OidcService } from '../oidc.service.ee';
import { Publisher } from '@/scaling/pubsub/publisher.service';

describe('OidcService', () => {
	let oidcService: OidcService;
	let settingsRepository: SettingsRepository;
	let globalConfig: GlobalConfig;
	let instanceSettings: InstanceSettings;
	let cipher: Cipher;
	let logger: Logger;
	let jwtService: JwtService;

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

		jest
			.spyOn(ssoHelpers, 'setCurrentAuthenticationMethod')
			.mockImplementation(async () => await Promise.resolve());

		oidcService = new OidcService(
			settingsRepository,
			mock<AuthIdentityRepository>(),
			mock<UrlService>(),
			globalConfig,
			mock<UserRepository>(),
			cipher,
			logger,
			jwtService,
			instanceSettings,
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

			await oidcService.updateConfig(mockOidcConfig);

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

			await oidcService.updateConfig(mockOidcConfig);

			// Should not attempt to import Publisher in single main setup
			expect(mockPublisher.publishCommand).not.toHaveBeenCalled();
		});
	});
});
