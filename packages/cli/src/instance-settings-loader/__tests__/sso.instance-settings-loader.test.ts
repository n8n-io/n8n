import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';

import { SsoInstanceSettingsLoader } from '../loaders/sso.instance-settings-loader';

const mockSetCurrentAuthenticationMethod = jest.fn();
const mockGetCurrentAuthenticationMethod = jest.fn().mockReturnValue('email');
jest.mock('@/sso.ee/sso-helpers', () => ({
	setCurrentAuthenticationMethod: (...args: unknown[]) =>
		mockSetCurrentAuthenticationMethod(...args),
	getCurrentAuthenticationMethod: () => mockGetCurrentAuthenticationMethod(),
}));

describe('SsoInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const baseConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: false,
		oidcClientId: '',
		oidcClientSecret: '',
		oidcDiscoveryEndpoint: '',
		oidcLoginEnabled: false,
		oidcPrompt: 'select_account',
		oidcAcrValues: '',
		samlMetadata: '',
		samlMetadataUrl: '',
		samlLoginEnabled: false,
		ssoUserRoleProvisioning: 'disabled',
	};

	const validSamlConfig: Partial<InstanceSettingsLoaderConfig> = {
		...baseConfig,
		ssoManagedByEnv: true,
		samlMetadata: '<xml>metadata</xml>',
		samlLoginEnabled: true,
	};

	const validOidcConfig: Partial<InstanceSettingsLoaderConfig> = {
		...baseConfig,
		ssoManagedByEnv: true,
		oidcClientId: 'my-client-id',
		oidcClientSecret: 'my-client-secret',
		oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
		oidcLoginEnabled: true,
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = { ...baseConfig, ...configOverrides } as InstanceSettingsLoaderConfig;
		return new SsoInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	const getSaveCall = (key: string) =>
		settingsRepository.save.mock.calls.find(
			(call) => (call[0] as { key: string }).key === key,
		)?.[0] as { key: string; value: string } | undefined;

	const getUpsertCall = (key: string) =>
		settingsRepository.upsert.mock.calls.find(
			(call) => (call[0] as { key: string }).key === key,
		)?.[0] as { key: string; value: string } | undefined;

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encryptV2.mockImplementation(async (v: string) => `encrypted:${v}`);
		mockGetCurrentAuthenticationMethod.mockReturnValue('email');
	});

	describe('ssoManagedByEnv gate', () => {
		it('should skip when ssoManagedByEnv is false', async () => {
			const loader = createLoader({ ssoManagedByEnv: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(settingsRepository.save).not.toHaveBeenCalled();
			expect(settingsRepository.upsert).not.toHaveBeenCalled();
		});
	});

	describe('mutual exclusion', () => {
		it('should throw when both SAML and OIDC login are enabled', async () => {
			const loader = createLoader({
				...validSamlConfig,
				...validOidcConfig,
				samlLoginEnabled: true,
				oidcLoginEnabled: true,
			});

			await expect(loader.run()).rejects.toThrow(
				'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true',
			);
		});
	});

	describe('SAML config', () => {
		it('should throw when neither metadata nor metadataUrl is provided and loginEnabled is true', async () => {
			const loader = createLoader({
				...validSamlConfig,
				samlMetadata: '',
				samlMetadataUrl: '',
			});

			await expect(loader.run()).rejects.toThrow(
				'At least one of N8N_SSO_SAML_METADATA or N8N_SSO_SAML_METADATA_URL is required',
			);
		});

		it('should save SAML preferences when valid config with metadata is provided', async () => {
			const loader = createLoader(validSamlConfig);

			const result = await loader.run();

			expect(result).toBe('created');
			const saved = getSaveCall('features.saml');
			expect(saved).toBeDefined();
			expect(JSON.parse(saved!.value)).toEqual({
				metadata: '<xml>metadata</xml>',
				loginEnabled: true,
			});
		});

		it('should save SAML preferences when valid config with metadataUrl is provided', async () => {
			const loader = createLoader({
				...validSamlConfig,
				samlMetadata: '',
				samlMetadataUrl: 'https://idp.example.com/metadata',
			});

			await loader.run();

			const saved = JSON.parse(getSaveCall('features.saml')!.value);
			expect(saved.metadataUrl).toBe('https://idp.example.com/metadata');
			expect(saved.metadata).toBeUndefined();
		});

		it('should set authentication method to saml when SAML login is enabled', async () => {
			const loader = createLoader(validSamlConfig);

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('saml');
		});
	});

	describe('OIDC config', () => {
		it('should throw when clientId is missing and loginEnabled is true', async () => {
			const loader = createLoader({ ...validOidcConfig, oidcClientId: '' });
			await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_ID is required');
		});

		it('should throw when clientSecret is missing and loginEnabled is true', async () => {
			const loader = createLoader({ ...validOidcConfig, oidcClientSecret: '' });
			await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_SECRET is required');
		});

		it('should throw when discoveryEndpoint is not a valid URL and loginEnabled is true', async () => {
			const loader = createLoader({ ...validOidcConfig, oidcDiscoveryEndpoint: 'not-a-url' });
			await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_DISCOVERY_ENDPOINT');
		});

		it('should throw when oidcPrompt has an invalid value', async () => {
			const loader = createLoader({ ...validOidcConfig, oidcPrompt: 'invalid' });
			await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_PROMPT');
		});

		it('should upsert OIDC preferences when valid config is provided', async () => {
			const loader = createLoader(validOidcConfig);

			const result = await loader.run();

			expect(result).toBe('created');
			const upserted = getUpsertCall('features.oidc');
			expect(upserted).toBeDefined();
			const parsed = JSON.parse(upserted!.value);
			expect(parsed.clientId).toBe('my-client-id');
			expect(parsed.clientSecret).toBe('encrypted:my-client-secret');
			expect(parsed.loginEnabled).toBe(true);
		});

		it('should handle messy ACR values with extra commas and whitespace', async () => {
			const loader = createLoader({ ...validOidcConfig, oidcAcrValues: ',mfa,,  phrh  ,,' });

			await loader.run();

			const parsed = JSON.parse(getUpsertCall('features.oidc')!.value);
			expect(parsed.authenticationContextClassReference).toEqual(['mfa', 'phrh']);
		});

		it('should set authentication method to oidc when OIDC login is enabled', async () => {
			const loader = createLoader(validOidcConfig);

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('oidc');
		});
	});

	describe('provisioning', () => {
		it('should throw when ssoUserRoleProvisioning has an invalid value with SAML enabled', async () => {
			const loader = createLoader({ ...validSamlConfig, ssoUserRoleProvisioning: 'invalid' });

			await expect(loader.run()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
		});

		it('should throw when ssoUserRoleProvisioning has an invalid value with OIDC enabled', async () => {
			const loader = createLoader({ ...validOidcConfig, ssoUserRoleProvisioning: 'invalid' });

			await expect(loader.run()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
		});

		it('should write disabled provisioning config when SAML is enabled', async () => {
			const loader = createLoader(validSamlConfig);

			await loader.run();

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'features.provisioning',
					value: JSON.stringify({
						scopesProvisionInstanceRole: false,
						scopesProvisionProjectRoles: false,
					}),
				}),
				{ conflictPaths: ['key'] },
			);
		});

		it('should write instance_role provisioning config', async () => {
			const loader = createLoader({ ...validSamlConfig, ssoUserRoleProvisioning: 'instance_role' });

			await loader.run();

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'features.provisioning',
					value: JSON.stringify({
						scopesProvisionInstanceRole: true,
						scopesProvisionProjectRoles: false,
					}),
				}),
				{ conflictPaths: ['key'] },
			);
		});

		it('should write instance_and_project_roles provisioning config', async () => {
			const loader = createLoader({
				...validOidcConfig,
				ssoUserRoleProvisioning: 'instance_and_project_roles',
			});

			await loader.run();

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'features.provisioning',
					value: JSON.stringify({
						scopesProvisionInstanceRole: true,
						scopesProvisionProjectRoles: true,
					}),
				}),
				{ conflictPaths: ['key'] },
			);
		});

		it('should not write provisioning config when neither protocol is enabled', async () => {
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(
				settingsRepository.upsert.mock.calls.find(
					(call) => (call[0] as { key: string }).key === 'features.provisioning',
				),
			).toBeUndefined();
		});
	});

	describe('disabled config', () => {
		it('should write loginEnabled=false for both protocols when no env vars are set', async () => {
			const loader = createLoader({ ssoManagedByEnv: true });

			const result = await loader.run();

			expect(result).toBe('created');
			expect(getSaveCall('features.saml')?.value).toBe(JSON.stringify({ loginEnabled: false }));
			expect(getUpsertCall('features.oidc')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});

		it('should ignore SAML env vars and write loginEnabled=false when SAML is not enabled', async () => {
			const loader = createLoader({
				...validSamlConfig,
				samlLoginEnabled: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(getSaveCall('features.saml')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});

		it('should ignore OIDC env vars and write loginEnabled=false when OIDC is not enabled', async () => {
			const loader = createLoader({
				...validOidcConfig,
				oidcLoginEnabled: false,
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(getUpsertCall('features.oidc')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});

		it('should ignore invalid OIDC env vars and write loginEnabled=false when OIDC is not enabled', async () => {
			const loader = createLoader({
				ssoManagedByEnv: true,
				oidcClientId: 'some-id',
				oidcDiscoveryEndpoint: 'not-a-url',
			});

			const result = await loader.run();

			expect(result).toBe('created');
			expect(getUpsertCall('features.oidc')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});
	});

	describe('auth method sync', () => {
		it('should reset auth method to email when current is saml and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
		});

		it('should reset auth method to email when current is oidc and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
		});

		it('should not change auth method when current is email and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('email');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalled();
		});

		it('should set auth method to saml (not email) when switching from oidc to saml', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
			const loader = createLoader(validSamlConfig);

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('saml');
			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalledWith('email');
		});

		it('should set auth method to oidc (not email) when switching from saml to oidc', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
			const loader = createLoader(validOidcConfig);

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('oidc');
			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalledWith('email');
		});
	});

	describe('cross-protocol state', () => {
		it('should write OIDC loginEnabled=false when SAML is enabled and OIDC has no env vars', async () => {
			const loader = createLoader(validSamlConfig);

			await loader.run();

			expect(getUpsertCall('features.oidc')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});

		it('should write SAML loginEnabled=false when OIDC is enabled and SAML has no env vars', async () => {
			const loader = createLoader(validOidcConfig);

			await loader.run();

			expect(getSaveCall('features.saml')?.value).toBe(JSON.stringify({ loginEnabled: false }));
		});
	});
});
