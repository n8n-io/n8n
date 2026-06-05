import { ProvisioningConfigDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig, InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { jsonParse } from 'n8n-workflow';

import { ProvisioningInstanceSettingsLoader } from '../../loaders/sso/provisioning.instance-settings-loader';

describe('ProvisioningInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();

	const globalConfig = {
		sso: {
			provisioning: {
				scopesName: 'n8n',
				scopesInstanceRoleClaimName: 'n8n_instance_role',
				scopesProjectsRolesClaimName: 'n8n_projects',
			},
		},
	} as GlobalConfig;

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = {
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;
		return new ProvisioningInstanceSettingsLoader(config, globalConfig, settingsRepository, logger);
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
					scopesName: 'n8n',
					scopesInstanceRoleClaimName: 'n8n_instance_role',
					scopesProjectsRolesClaimName: 'n8n_projects',
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
					scopesName: 'n8n',
					scopesInstanceRoleClaimName: 'n8n_instance_role',
					scopesProjectsRolesClaimName: 'n8n_projects',
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
					scopesName: 'n8n',
					scopesInstanceRoleClaimName: 'n8n_instance_role',
					scopesProjectsRolesClaimName: 'n8n_projects',
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	describe('persisted value is consumable by ProvisioningConfigDto', () => {
		// The loader writes the row that the provisioning service reads back via
		// ProvisioningConfigDto.parse(). If parse fails the service silently falls
		// back to disabled defaults and IdP role claims are ignored.
		const modes = ['disabled', 'instance_role', 'instance_and_project_roles'] as const;

		it.each(modes)('round-trips for %s', async (mode) => {
			const loader = createLoader({ ssoUserRoleProvisioning: mode });

			await loader.apply();

			const upsertCall = settingsRepository.upsert.mock.calls[0][0] as { value: string };
			const persisted = jsonParse<unknown>(upsertCall.value);

			expect(() => ProvisioningConfigDto.parse(persisted)).not.toThrow();
		});
	});
});
