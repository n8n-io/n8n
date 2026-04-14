import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';

import { SamlInstanceSettingsLoader } from '../loaders/saml.instance-settings-loader';

describe('SamlInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();
	const cipher = mock<Cipher>();

	const validConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: true,
		samlMetadata: '<xml>metadata</xml>',
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
			...configOverrides,
		} as InstanceSettingsLoaderConfig;

		return new SamlInstanceSettingsLoader(config, settingsRepository, cipher, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		cipher.encrypt.mockReturnValue('encrypted-key');
	});

	it('should skip when ssoManagedByEnv is false', async () => {
		const loader = createLoader({ ssoManagedByEnv: false });

		const result = await loader.run();

		expect(result).toBe('skipped');
		expect(settingsRepository.save).not.toHaveBeenCalled();
	});

	it('should throw when neither metadata nor metadataUrl is provided', async () => {
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
			loginEnabled: false,
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
		const loader = createLoader({ ...validConfig, samlLoginEnabled: true });

		await loader.run();

		// First call: SAML preferences, second call: authentication method
		expect(settingsRepository.save).toHaveBeenCalledTimes(2);
		expect(settingsRepository.save).toHaveBeenCalledWith(
			{
				key: 'userManagement.authenticationMethod',
				value: 'saml',
				loadOnStartup: true,
			},
			{ transaction: false },
		);
	});

	it('should not set authentication method when loginEnabled is false', async () => {
		const loader = createLoader({ ...validConfig, samlLoginEnabled: false });

		await loader.run();

		// Only one call: SAML preferences
		expect(settingsRepository.save).toHaveBeenCalledTimes(1);
		expect(settingsRepository.save).not.toHaveBeenCalledWith(
			expect.objectContaining({ key: 'userManagement.authenticationMethod' }),
			expect.anything(),
		);
	});
});
