import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';

import { SamlInstanceSettingsLoader } from '../loaders/saml.instance-settings-loader';

const mockSetCurrentAuthenticationMethod = jest.fn();
const mockGetCurrentAuthenticationMethod = jest.fn().mockReturnValue('email');
jest.mock('@/sso.ee/sso-helpers', () => ({
	setCurrentAuthenticationMethod: (...args: unknown[]) =>
		mockSetCurrentAuthenticationMethod(...args),
	getCurrentAuthenticationMethod: () => mockGetCurrentAuthenticationMethod(),
}));

describe('SamlInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const validConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: true,
		samlMetadata: '<xml>metadata</xml>',
		samlMetadataUrl: '',
		samlLoginEnabled: true,
		samlLoginLabel: '',
		samlLoginBinding: 'redirect',
		samlAcsBinding: 'post',
		samlIgnoreSsl: false,
		samlAuthnRequestsSigned: false,
		samlWantAssertionsSigned: true,
		samlWantMessageSigned: true,
		samlSigningPrivateKey: '',
		samlSigningCertificate: '',
		samlRelayState: '',
		samlMappingEmail: '',
		samlMappingFirstName: '',
		samlMappingLastName: '',
		samlMappingUserPrincipalName: '',
		samlMappingInstanceRole: '',
		samlMappingProjectRoles: '',
		oidcLoginEnabled: false,
		ssoUserRoleProvisioning: 'disabled',
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ssoManagedByEnv: false,
			samlMetadata: '',
			samlMetadataUrl: '',
			samlLoginEnabled: false,
			samlLoginLabel: '',
			samlLoginBinding: 'redirect',
			samlAcsBinding: 'post',
			samlIgnoreSsl: false,
			samlAuthnRequestsSigned: false,
			samlWantAssertionsSigned: true,
			samlWantMessageSigned: true,
			samlSigningPrivateKey: '',
			samlSigningCertificate: '',
			samlRelayState: '',
			samlMappingEmail: '',
			samlMappingFirstName: '',
			samlMappingLastName: '',
			samlMappingUserPrincipalName: '',
			samlMappingInstanceRole: '',
			samlMappingProjectRoles: '',
			oidcLoginEnabled: false,
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new SamlInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encrypt.mockReturnValue('encrypted-key');
		mockGetCurrentAuthenticationMethod.mockReturnValue('email');
	});

	it('should skip when ssoManagedByEnv is false', async () => {
		const loader = createLoader({ ssoManagedByEnv: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(settingsRepository.save).not.toHaveBeenCalled();
	});

	it('should warn when SAML env vars are set but ssoManagedByEnv is false', async () => {
		const loader = createLoader({
			ssoManagedByEnv: false,
			samlMetadata: '<xml>metadata</xml>',
		});

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(logger.warn).toHaveBeenCalledWith(
			'N8N_SSO_SAML_* env vars are set but N8N_SSO_MANAGED_BY_ENV is not enabled — ignoring SSO env vars',
		);
	});

	it('should throw when both SAML and OIDC login are enabled', async () => {
		const loader = createLoader({
			...validConfig,
			samlLoginEnabled: true,
			oidcLoginEnabled: true,
		});

		await expect(loader.run()).rejects.toThrow(
			'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true',
		);
	});

	it('should throw when neither metadata nor metadataUrl is provided and loginEnabled is true', async () => {
		const loader = createLoader({
			...validConfig,
			samlMetadata: '',
			samlMetadataUrl: '',
		});

		await expect(loader.run()).rejects.toThrow(
			'At least one of N8N_SSO_SAML_METADATA or N8N_SSO_SAML_METADATA_URL is required',
		);
	});

	it('should throw when loginBinding has an invalid value', async () => {
		const loader = createLoader({ ...validConfig, samlLoginBinding: 'invalid' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_SAML_LOGIN_BINDING');
	});

	it('should throw when acsBinding has an invalid value', async () => {
		const loader = createLoader({ ...validConfig, samlAcsBinding: 'invalid' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_SAML_ACS_BINDING');
	});

	it('should throw when ssoUserRoleProvisioning has an invalid value', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'invalid' });

		await expect(loader.run()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
	});

	it('should upsert settings when valid config is provided with metadata', async () => {
		const loader = createLoader(validConfig);

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.saml',
				loadOnStartup: true,
			}),
		);

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue).toEqual({
			metadata: '<xml>metadata</xml>',
			loginEnabled: true,
			loginBinding: 'redirect',
			acsBinding: 'post',
			ignoreSSL: false,
			authnRequestsSigned: false,
			wantAssertionsSigned: true,
			wantMessageSigned: true,
			relayState: '',
		});
	});

	it('should upsert settings when valid config is provided with metadataUrl', async () => {
		const loader = createLoader({
			...validConfig,
			samlMetadata: '',
			samlMetadataUrl: 'https://idp.example.com/metadata',
		});

		const result = await loader.run();

		expect(result).toBe('created');

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.metadataUrl).toBe('https://idp.example.com/metadata');
		expect(savedValue.metadata).toBeUndefined();
	});

	it('should encrypt signing private key before storing', async () => {
		const loader = createLoader({
			...validConfig,
			samlSigningPrivateKey: 'my-private-key',
			samlSigningCertificate: 'my-certificate',
		});

		await loader.run();

		expect(cipher.encrypt).toHaveBeenCalledWith('my-private-key');

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.signingPrivateKey).toBe('encrypted-key');
		expect(savedValue.signingCertificate).toBe('my-certificate');
	});

	it('should include attribute mapping when non-empty fields are set', async () => {
		const loader = createLoader({
			...validConfig,
			samlMappingEmail: 'email',
			samlMappingFirstName: 'givenName',
			samlMappingLastName: 'surname',
			samlMappingUserPrincipalName: 'upn',
			samlMappingInstanceRole: 'role',
		});

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.mapping).toEqual({
			email: 'email',
			firstName: 'givenName',
			lastName: 'surname',
			userPrincipalName: 'upn',
			n8nInstanceRole: 'role',
		});
	});

	it('should split comma-separated project roles into array', async () => {
		const loader = createLoader({
			...validConfig,
			samlMappingProjectRoles: 'proj1:admin, proj2:editor, proj3:viewer',
		});

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.mapping.n8nProjectRoles).toEqual([
			'proj1:admin',
			'proj2:editor',
			'proj3:viewer',
		]);
	});

	it('should not include mapping when all mapping fields are empty', async () => {
		const loader = createLoader(validConfig);

		await loader.run();

		const savedValue = JSON.parse(
			(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
		);
		expect(savedValue.mapping).toBeUndefined();
	});

	it('should set authentication method to saml when loginEnabled is true', async () => {
		const loader = createLoader(validConfig);

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('saml');
	});

	it('should set authentication method to email when loginEnabled is false and current is saml', async () => {
		mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
		const loader = createLoader({
			ssoManagedByEnv: true,
			samlLoginEnabled: false,
		});

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
	});

	it('should not change authentication method when loginEnabled is false and current is not saml', async () => {
		mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
		const loader = createLoader({
			ssoManagedByEnv: true,
			samlLoginEnabled: false,
		});

		await loader.run();

		expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalled();
	});

	it('should write loginEnabled=false to DB when no SAML env vars are set', async () => {
		const loader = createLoader({ ssoManagedByEnv: true });

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.saml',
				value: JSON.stringify({ loginEnabled: false }),
			}),
		);
	});

	it('should soft-validate and save when loginEnabled is false but env vars are set', async () => {
		const loader = createLoader({
			...validConfig,
			samlLoginEnabled: false,
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'features.saml' }),
		);
	});

	it('should warn and not fail when loginEnabled is false but env vars are invalid', async () => {
		const loader = createLoader({
			ssoManagedByEnv: true,
			samlLoginEnabled: false,
			samlMetadata: '<xml>metadata</xml>',
			samlLoginBinding: 'invalid',
		});

		const result = await loader.run();

		expect(result).toBe('created');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('SAML env vars are set but invalid'),
		);
	});

	it('should disable stale OIDC loginEnabled in DB when SAML is enabled', async () => {
		settingsRepository.findOne.mockResolvedValue({
			key: 'features.oidc',
			value: JSON.stringify({ loginEnabled: true, clientId: 'old-id' }),
			loadOnStartup: true,
		} as never);

		const loader = createLoader(validConfig);
		await loader.run();

		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: 'features.oidc',
				value: JSON.stringify({ loginEnabled: false, clientId: 'old-id' }),
			}),
		);
	});

	it('should not touch OIDC DB entry if it does not exist', async () => {
		settingsRepository.findOne.mockResolvedValue(null);

		const loader = createLoader(validConfig);
		await loader.run();

		// save is called once for SAML preferences, not for OIDC cleanup
		const saveCalls = settingsRepository.save.mock.calls;
		expect(saveCalls.every((call) => (call[0] as { key: string }).key === 'features.saml')).toBe(
			true,
		);
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

	it('should write provisioning config for instance_role mode', async () => {
		const loader = createLoader({ ...validConfig, ssoUserRoleProvisioning: 'instance_role' });

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

	it('should write provisioning config for instance_and_project_roles mode', async () => {
		const loader = createLoader({
			...validConfig,
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
});
