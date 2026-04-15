import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';

import { OidcInstanceSettingsLoader } from '../loaders/oidc.instance-settings-loader';

describe('OidcInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const validConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: true,
		ssoProtocol: 'oidc',
		oidcClientId: 'my-client-id',
		oidcClientSecret: 'my-client-secret',
		oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
		oidcLoginEnabled: false,
		oidcPrompt: 'select_account',
		oidcAcrValues: '',
		ssoUserRoleProvisioning: 'disabled',
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ssoManagedByEnv: false,
			ssoProtocol: '',
			oidcClientId: '',
			oidcClientSecret: '',
			oidcDiscoveryEndpoint: '',
			oidcLoginEnabled: false,
			oidcPrompt: 'select_account',
			oidcAcrValues: '',
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new OidcInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encrypt.mockReturnValue('encrypted-secret');
	});

	it('should skip when ssoManagedByEnv is false', async () => {
		const loader = createLoader({ ssoManagedByEnv: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(settingsRepository.upsert).not.toHaveBeenCalled();
	});

	it('should throw when clientId is missing', async () => {
		const loader = createLoader({ ...validConfig, oidcClientId: '' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_ID is required');
	});

	it('should throw when clientSecret is missing', async () => {
		const loader = createLoader({ ...validConfig, oidcClientSecret: '' });
		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_SECRET is required');
	});

	it('should throw when discoveryEndpoint is not a valid URL', async () => {
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

	it('should skip when ssoProtocol is set to saml', async () => {
		const loader = createLoader({ ...validConfig, ssoProtocol: 'saml' });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(settingsRepository.upsert).not.toHaveBeenCalled();
	});

	it('should run when ssoProtocol is explicitly set to oidc', async () => {
		const loader = createLoader({ ...validConfig, ssoProtocol: 'oidc' });

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.upsert).toHaveBeenCalled();
	});

	it('should throw when ssoProtocol is not set', async () => {
		const loader = createLoader({ ...validConfig, ssoProtocol: '' });

		await expect(loader.run()).rejects.toThrow(
			'N8N_SSO_PROTOCOL is required when N8N_SSO_MANAGED_BY_ENV is enabled',
		);
	});

	it('should throw when ssoProtocol has an invalid value', async () => {
		const loader = createLoader({ ...validConfig, ssoProtocol: 'ldap' });

		await expect(loader.run()).rejects.toThrow(
			'N8N_SSO_PROTOCOL is required when N8N_SSO_MANAGED_BY_ENV is enabled',
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
});
