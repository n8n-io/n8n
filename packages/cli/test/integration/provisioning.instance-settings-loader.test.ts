import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ProvisioningInstanceSettingsLoader } from '@/instance-settings-loader/loaders/sso/provisioning.instance-settings-loader';
import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ProvisioningInstanceSettingsLoader', () => {
	let originalLoaderConfig: Record<string, unknown>;
	let originalProvisioningConfig: Record<string, unknown>;

	beforeEach(() => {
		const globalConfig = Container.get(GlobalConfig);
		originalLoaderConfig = { ...globalConfig.instanceSettingsLoader };
		originalProvisioningConfig = { ...globalConfig.sso.provisioning };
	});

	afterEach(async () => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, originalLoaderConfig);
		Object.assign(globalConfig.sso.provisioning, originalProvisioningConfig);

		await Container.get(SettingsRepository).delete({ key: PROVISIONING_PREFERENCES_DB_KEY });
	});

	const applyWith = async (mode: string, scopesUseExpressionMapping = false) => {
		const globalConfig = Container.get(GlobalConfig);
		Object.assign(globalConfig.instanceSettingsLoader, {
			ssoManagedByEnv: true,
			ssoUserRoleProvisioning: mode,
		});
		globalConfig.sso.provisioning.scopesUseExpressionMapping = scopesUseExpressionMapping;

		await Container.get(ProvisioningInstanceSettingsLoader).apply();
	};

	it('should write a row that ProvisioningService reads back as expression mapping', async () => {
		await applyWith('instance_and_project_roles', true);

		const provisioningService = Container.get(ProvisioningService);
		const config = await provisioningService.loadConfig();

		expect(config).toMatchObject({
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: true,
		});
	});

	it('should keep expression mapping off for direct-claim modes', async () => {
		await applyWith('instance_and_project_roles');

		const config = await Container.get(ProvisioningService).loadConfig();

		expect(config).toMatchObject({
			scopesProvisionInstanceRole: true,
			scopesProvisionProjectRoles: true,
			scopesUseExpressionMapping: false,
		});
	});

	it('should leave everything off for the disabled mode, which assigns roles manually', async () => {
		await applyWith('disabled', true);

		const config = await Container.get(ProvisioningService).loadConfig();

		expect(config).toMatchObject({
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: false,
		});
	});

	it('should survive a restart, which is what the DB row is for', async () => {
		await applyWith('instance_role', true);
		// Second boot with the same env: the row must not flip back to direct-claim.
		await applyWith('instance_role', true);

		const config = await Container.get(ProvisioningService).loadConfig();

		expect(config.scopesUseExpressionMapping).toBe(true);
	});
});
