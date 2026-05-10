import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { SsoInstanceSettingsLoader } from '@/instance-settings-loader/loaders/sso.instance-settings-loader';
import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import { SAML_PREFERENCES_DB_KEY } from '@/modules/sso-saml/constants';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('SsoInstanceSettingsLoader → OidcService roundtrip', () => {
	let originalConfig: Record<string, unknown>;

	beforeEach(() => {
		const globalConfig = Container.get(GlobalConfig);
		const loader = globalConfig.instanceSettingsLoader;
		originalConfig = { ...loader };
	});

	afterEach(async () => {
		// Restore original config
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, originalConfig);

		// Clean up DB rows
		const settingsRepository = Container.get(SettingsRepository);
		await settingsRepository.delete({ key: OIDC_PREFERENCES_DB_KEY });
		await settingsRepository.delete({ key: SAML_PREFERENCES_DB_KEY });
		await settingsRepository.delete({ key: PROVISIONING_PREFERENCES_DB_KEY });
	});

	it('should write config that OidcService reads back with correct values', async () => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, {
			ssoManagedByEnv: true,
			oidcClientId: 'my-client-id',
			oidcClientSecret: 'my-actual-secret',
			oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
			oidcLoginEnabled: true,
			oidcPrompt: 'consent',
			oidcAcrValues: 'mfa, phrh',
			ssoUserRoleProvisioning: 'instance_and_project_roles',
		});

		const loader = Container.get(SsoInstanceSettingsLoader);
		await loader.run();

		const oidcService = Container.get(OidcService);
		const config = await oidcService.loadConfig(true);

		expect(config.clientId).toBe('my-client-id');
		expect(config.clientSecret).toBe('my-actual-secret');
		expect(config.discoveryEndpoint.toString()).toBe(
			'https://idp.example.com/.well-known/openid-configuration',
		);
		expect(config.loginEnabled).toBe(true);
		expect(config.prompt).toBe('consent');
		expect(config.authenticationContextClassReference).toEqual(['mfa', 'phrh']);
	});
});
