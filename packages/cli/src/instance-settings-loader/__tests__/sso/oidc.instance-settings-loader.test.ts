import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

import { OidcInstanceSettingsLoader } from '../../loaders/sso/oidc.instance-settings-loader';

describe('OidcInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const baseConfig: Partial<InstanceSettingsLoaderConfig> = {
		oidcClientId: '',
		oidcClientSecret: '',
		oidcDiscoveryEndpoint: '',
		oidcLoginEnabled: false,
		oidcPrompt: 'select_account',
		oidcAcrValues: '',
	};

	const validConfig: Partial<InstanceSettingsLoaderConfig> = {
		...baseConfig,
		oidcClientId: 'my-client-id',
		oidcClientSecret: 'my-client-secret',
		oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
		oidcLoginEnabled: true,
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = { ...baseConfig, ...configOverrides } as InstanceSettingsLoaderConfig;
		return new OidcInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	const getUpsertedValue = () =>
		JSON.parse((settingsRepository.upsert.mock.calls[0][0] as { value: string }).value);

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encryptV2.mockImplementation(async (v: string) => `encrypted:${v}`);
	});

	describe('when OIDC login is enabled', () => {
		it('should throw when clientId is missing', async () => {
			const loader = createLoader({ ...validConfig, oidcClientId: '' });
			await expect(loader.apply()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_ID is required');
		});

		it('should throw when clientSecret is missing', async () => {
			const loader = createLoader({ ...validConfig, oidcClientSecret: '' });
			await expect(loader.apply()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_SECRET is required');
		});

		it('should throw when discoveryEndpoint is not a valid URL', async () => {
			const loader = createLoader({ ...validConfig, oidcDiscoveryEndpoint: 'not-a-url' });
			await expect(loader.apply()).rejects.toThrow('N8N_SSO_OIDC_DISCOVERY_ENDPOINT');
		});

		it('should throw when oidcPrompt has an invalid value', async () => {
			const loader = createLoader({ ...validConfig, oidcPrompt: 'invalid' });
			await expect(loader.apply()).rejects.toThrow('N8N_SSO_OIDC_PROMPT');
		});

		it('should upsert preferences with encrypted clientSecret when valid config is provided', async () => {
			const loader = createLoader(validConfig);

			await loader.apply();

			const parsed = getUpsertedValue();
			expect(parsed.clientId).toBe('my-client-id');
			expect(parsed.clientSecret).toBe('encrypted:my-client-secret');
			expect(parsed.loginEnabled).toBe(true);
		});

		it('should handle messy ACR values with extra commas and whitespace', async () => {
			const loader = createLoader({ ...validConfig, oidcAcrValues: ',mfa,,  phrh  ,,' });

			await loader.apply();

			const parsed = getUpsertedValue();
			expect(parsed.authenticationContextClassReference).toEqual(['mfa', 'phrh']);
		});
	});

	describe('when OIDC login is disabled', () => {
		it('should upsert loginEnabled=false', async () => {
			const loader = createLoader({ oidcLoginEnabled: false });

			await loader.apply();

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: 'features.oidc',
					value: JSON.stringify({ loginEnabled: false }),
					loadOnStartup: true,
				},
				{ conflictPaths: ['key'] },
			);
		});

		it('should ignore OIDC env vars and upsert loginEnabled=false', async () => {
			const loader = createLoader({ ...validConfig, oidcLoginEnabled: false });

			await loader.apply();

			expect(getUpsertedValue()).toEqual({ loginEnabled: false });
		});

		it('should ignore invalid OIDC env vars and upsert loginEnabled=false', async () => {
			const loader = createLoader({
				oidcClientId: 'some-id',
				oidcDiscoveryEndpoint: 'not-a-url',
				oidcLoginEnabled: false,
			});

			await loader.apply();

			expect(getUpsertedValue()).toEqual({ loginEnabled: false });
		});
	});
});
