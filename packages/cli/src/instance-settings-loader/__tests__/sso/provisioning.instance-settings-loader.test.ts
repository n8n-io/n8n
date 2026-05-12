import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ProvisioningInstanceSettingsLoader } from '../../loaders/sso/provisioning.instance-settings-loader';

describe('ProvisioningInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;
		return new ProvisioningInstanceSettingsLoader(config, settingsRepository, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	it('should throw when ssoUserRoleProvisioning has an invalid value', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'invalid' });

		await expect(loader.apply()).rejects.toThrow('N8N_SSO_USER_ROLE_PROVISIONING must be one of');
	});

	it('should write disabled provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'disabled' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	it('should write instance_role provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'instance_role' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	it('should write instance_and_project_roles provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'instance_and_project_roles' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
					scopesUseExpressionMapping: false,
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});
});
