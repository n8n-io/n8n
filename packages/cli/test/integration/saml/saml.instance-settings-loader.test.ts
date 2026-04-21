import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

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
