import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { SsoInstanceSettingsLoader } from '@/instance-settings-loader/loaders/sso.instance-settings-loader';
import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';
import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('SsoInstanceSettingsLoader → SamlService roundtrip', () => {
	let originalConfig: Record<string, unknown>;

	beforeEach(() => {
		const globalConfig = Container.get(GlobalConfig);
		const loader = globalConfig.instanceSettingsLoader;
		originalConfig = { ...loader };
	});

	afterEach(async () => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, originalConfig);

		const settingsRepository = Container.get(SettingsRepository);
		await settingsRepository.delete({ key: OIDC_PREFERENCES_DB_KEY });
		await settingsRepository.delete({ key: SAML_PREFERENCES_DB_KEY });
		await settingsRepository.delete({ key: PROVISIONING_PREFERENCES_DB_KEY });
	});

	it('should write config that SamlService reads back with correct values', async () => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, {
			ssoManagedByEnv: true,
			samlMetadata: '<xml>metadata</xml>',
			samlMetadataUrl: '',
			samlLoginEnabled: true,
			samlLoginLabel: 'Corporate SSO',
			samlLoginBinding: 'post',
			samlAcsBinding: 'redirect',
			samlIgnoreSsl: true,
			samlAuthnRequestsSigned: false,
			samlWantAssertionsSigned: false,
			samlWantMessageSigned: false,
			samlSigningPrivateKey: 'my-private-key',
			samlSigningCertificate: 'my-certificate',
			samlRelayState: 'https://app.example.com/saml',
			samlMappingEmail: 'email',
			samlMappingFirstName: 'givenName',
			samlMappingLastName: 'surname',
			samlMappingUserPrincipalName: 'upn',
			samlMappingInstanceRole: 'n8n_role',
			samlMappingProjectRoles: 'proj1:admin, proj2:editor',
			ssoUserRoleProvisioning: 'instance_and_project_roles',
		});

		const loader = Container.get(SsoInstanceSettingsLoader);
		await loader.run();

		const samlService = Container.get(SamlService);
		const prefs = await samlService.loadFromDbAndApplySamlPreferences(false);

		expect(prefs).toBeDefined();
		expect(prefs!.metadata).toBe('<xml>metadata</xml>');
		expect(prefs!.metadataUrl).toBeUndefined();
		expect(prefs!.loginEnabled).toBe(true);
		expect(prefs!.loginLabel).toBe('Corporate SSO');
		expect(prefs!.loginBinding).toBe('post');
		expect(prefs!.acsBinding).toBe('redirect');
		expect(prefs!.ignoreSSL).toBe(true);
		expect(prefs!.authnRequestsSigned).toBe(false);
		expect(prefs!.wantAssertionsSigned).toBe(false);
		expect(prefs!.wantMessageSigned).toBe(false);
		expect(prefs!.signingCertificate).toBe('my-certificate');
		expect(prefs!.relayState).toBe('https://app.example.com/saml');
		expect(prefs!.mapping).toEqual({
			email: 'email',
			firstName: 'givenName',
			lastName: 'surname',
			userPrincipalName: 'upn',
			n8nInstanceRole: 'n8n_role',
			n8nProjectRoles: ['proj1:admin', 'proj2:editor'],
		});

		const cipher = Container.get(Cipher);
		expect(cipher.decrypt(prefs!.signingPrivateKey!)).toBe('my-private-key');
	});

	it('should persist metadataUrl when used instead of metadata', async () => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, {
			ssoManagedByEnv: true,
			samlMetadata: '',
			samlMetadataUrl: 'https://idp.example.com/metadata',
			samlLoginEnabled: true,
			ssoUserRoleProvisioning: 'disabled',
		});

		const loader = Container.get(SsoInstanceSettingsLoader);
		await loader.run();

		const samlService = Container.get(SamlService);
		const prefs = await samlService.loadFromDbAndApplySamlPreferences(false);

		expect(prefs!.metadataUrl).toBe('https://idp.example.com/metadata');
		expect(prefs!.metadata).toBeUndefined();
	});
});
