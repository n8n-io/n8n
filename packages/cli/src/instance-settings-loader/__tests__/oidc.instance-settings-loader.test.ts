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
		expect(settingsRepository.save).not.toHaveBeenCalled();
	});

	it('should throw when clientId is missing', async () => {
		const loader = createLoader({ ...validConfig, oidcClientId: '' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_ID is required');
	});

	it('should throw when clientSecret is missing', async () => {
		const loader = createLoader({ ...validConfig, oidcClientSecret: '' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_CLIENT_SECRET is required');
	});

	it('should throw when discoveryEndpoint is missing', async () => {
		const loader = createLoader({ ...validConfig, oidcDiscoveryEndpoint: '' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_DISCOVERY_ENDPOINT');
	});

	it('should throw when discoveryEndpoint is not a valid URL', async () => {
		const loader = createLoader({ ...validConfig, oidcDiscoveryEndpoint: 'not-a-url' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_DISCOVERY_ENDPOINT');
	});

	it('should throw when oidcPrompt is an invalid value', async () => {
		const loader = createLoader({ ...validConfig, oidcPrompt: 'invalid' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_OIDC_PROMPT');
	});

	it('should upsert settings with encrypted secret when all values are valid', async () => {
		const loader = createLoader(validConfig);

		const result = await loader.run();

		expect(result).toBe('created');
		expect(cipher.encrypt).toHaveBeenCalledWith('my-client-secret');
		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.oidc',
				loadOnStartup: true,
			}),
		);

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue).toEqual({
			clientId: 'my-client-id',
			clientSecret: 'encrypted-secret',
			discoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
			loginEnabled: false,
			prompt: 'select_account',
			authenticationContextClassReference: [],
		});
	});

	it('should split comma-separated ACR values into array', async () => {
		const loader = createLoader({ ...validConfig, oidcAcrValues: 'mfa, phrh, pwd' });

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.authenticationContextClassReference).toEqual(['mfa', 'phrh', 'pwd']);
	});

	it('should store empty array when ACR values is empty', async () => {
		const loader = createLoader({ ...validConfig, oidcAcrValues: '' });

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.authenticationContextClassReference).toEqual([]);
	});

	it('should set loginEnabled to true when configured', async () => {
		const loader = createLoader({ ...validConfig, oidcLoginEnabled: true });

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.loginEnabled).toBe(true);
	});

	it('should throw when ssoUserRoleProvisioning is an invalid value', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'invalid' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
	});

	it('should write provisioning config with disabled mode', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'disabled' });

		await loader.run();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'features.provisioning' }),
			{ conflictPaths: ['key'] },
		);

		const savedValue = JSON.parse(
			(settingsRepository.upsert.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue).toEqual({
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
		});
	});

	it('should write provisioning config with instance_role mode', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'instance_role' });

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.upsert.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue).toEqual({
			scopesProvisionInstanceRole: true,
			scopesProvisionProjectRoles: false,
		});
	});

	it('should write provisioning config with instance_and_project_roles mode', async () => {
		const loader = createLoader({
			...validConfig,
			ssoUserRoleProvisioning: 'instance_and_project_roles',
		});

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.upsert.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue).toEqual({
			scopesProvisionInstanceRole: true,
			scopesProvisionProjectRoles: true,
		});
	});

	describe('isConfiguredByEnv', () => {
		it('should return false when ssoManagedByEnv is false', () => {
			const loader = createLoader({ ssoManagedByEnv: false });
			expect(loader.isConfiguredByEnv()).toBe(false);
		});

		it('should return true when ssoManagedByEnv is true', () => {
			const loader = createLoader({ ssoManagedByEnv: true });
			expect(loader.isConfiguredByEnv()).toBe(true);
		});
	});
});
