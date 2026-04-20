import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';

import { OidcInstanceSettingsLoader } from '../loaders/oidc.instance-settings-loader';

const mockSetCurrentAuthenticationMethod = jest.fn();
const mockGetCurrentAuthenticationMethod = jest.fn().mockReturnValue('email');
jest.mock('@/sso.ee/sso-helpers', () => ({
	setCurrentAuthenticationMethod: (...args: unknown[]) =>
		mockSetCurrentAuthenticationMethod(...args),
	getCurrentAuthenticationMethod: () => mockGetCurrentAuthenticationMethod(),
}));

describe('OidcInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const validConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: true,
		oidcClientId: 'my-client-id',
		oidcClientSecret: 'my-client-secret',
		oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
		oidcLoginEnabled: true,
		oidcPrompt: 'select_account',
		oidcAcrValues: '',
		samlLoginEnabled: false,
		ssoUserRoleProvisioning: 'disabled',
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ssoManagedByEnv: false,
			oidcClientId: '',
			oidcClientSecret: '',
			oidcDiscoveryEndpoint: '',
			oidcLoginEnabled: false,
			oidcPrompt: 'select_account',
			oidcAcrValues: '',
			samlLoginEnabled: false,
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new OidcInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encrypt.mockReturnValue('encrypted-secret');
		mockGetCurrentAuthenticationMethod.mockReturnValue('email');
	});

	it('should skip when ssoManagedByEnv is false', async () => {
		const loader = createLoader({ ssoManagedByEnv: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(settingsRepository.upsert).not.toHaveBeenCalled();
	});

	it('should throw when both OIDC and SAML login are enabled', async () => {
		const loader = createLoader({
			...validConfig,
			oidcLoginEnabled: true,
			samlLoginEnabled: true,
		});

		await expect(loader.run()).rejects.toThrow(
			'N8N_SSO_OIDC_LOGIN_ENABLED and N8N_SSO_SAML_LOGIN_ENABLED cannot both be true',
		);
	});

	it('should throw when clientId is missing and loginEnabled is true', async () => {
		const loader = createLoader({ ...validConfig, oidcClientId: '' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_ID is required');
	});

	it('should throw when clientSecret is missing and loginEnabled is true', async () => {
		const loader = createLoader({ ...validConfig, oidcClientSecret: '' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_SECRET is required');
	});

	it('should throw when discoveryEndpoint is not a valid URL and loginEnabled is true', async () => {
		const loader = createLoader({ ...validConfig, oidcDiscoveryEndpoint: 'not-a-url' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_DISCOVERY_ENDPOINT');
	});

	it('should throw when oidcPrompt is an invalid value', async () => {
		const loader = createLoader({ ...validConfig, oidcPrompt: 'invalid' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_PROMPT');
	});

	it('should throw when ssoUserRoleProvisioning is an invalid value', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'invalid' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
	});

	it('should set authentication method to oidc when loginEnabled is true', async () => {
		const loader = createLoader(validConfig);

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('oidc');
	});

	it('should set authentication method to email when loginEnabled is false and current is oidc', async () => {
		mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
		const loader = createLoader({
			ssoManagedByEnv: true,
			oidcLoginEnabled: false,
		});

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
	});

	it('should not change authentication method when loginEnabled is false and current is not oidc', async () => {
		mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
		const loader = createLoader({
			ssoManagedByEnv: true,
			oidcLoginEnabled: false,
		});

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalled();
	});

	it('should upsert settings when valid config is provided', async () => {
		const loader = createLoader(validConfig);

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'features.oidc' }),
			{ conflictPaths: ['key'] },
		);
	});

	it('should handle messy ACR values with extra commas and whitespace', async () => {
		const loader = createLoader({ ...validConfig, oidcAcrValues: ',mfa,,  phrh  ,,' });

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.upsert.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.authenticationContextClassReference).toEqual(['mfa', 'phrh']);
	});

	it('should write loginEnabled=false to DB when no OIDC env vars are set', async () => {
		const loader = createLoader({ ssoManagedByEnv: true });

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.oidc',
				value: JSON.stringify({ loginEnabled: false }),
			}),
			{ conflictPaths: ['key'] },
		);
	});

	it('should soft-validate and save when loginEnabled is false but env vars are set', async () => {
		const loader = createLoader({
			...validConfig,
			oidcLoginEnabled: false,
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'features.oidc' }),
			{ conflictPaths: ['key'] },
		);
	});

	it('should warn and not fail when loginEnabled is false but env vars are invalid', async () => {
		const loader = createLoader({
			ssoManagedByEnv: true,
			oidcLoginEnabled: false,
			oidcClientId: 'some-id',
			oidcDiscoveryEndpoint: 'not-a-url',
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('OIDC env vars are set but invalid'),
		);
	});

	it('should disable stale SAML loginEnabled in DB when OIDC is enabled', async () => {
		settingsRepository.findOne.mockResolvedValue({
			key: 'features.saml',
			value: JSON.stringify({ loginEnabled: true, metadata: '<xml>' }),
			loadOnStartup: true,
		} as never);

		const loader = createLoader(validConfig);
		await loader.run();

		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.saml',
				value: JSON.stringify({ loginEnabled: false, metadata: '<xml>' }),
			}),
		);
	});

	it('should not touch SAML DB entry if it does not exist', async () => {
		settingsRepository.findOne.mockResolvedValue(null);

		const loader = createLoader(validConfig);
		await loader.run();

		expect(settingsRepository.save).not.toHaveBeenCalled();
	});

	it('should write provisioning config when loginEnabled is true', async () => {
		const loader = createLoader(validConfig);

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
});
