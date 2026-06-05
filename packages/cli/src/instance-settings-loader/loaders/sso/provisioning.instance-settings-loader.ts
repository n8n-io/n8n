import { ProvisioningConfigDto, type ProvisioningMode } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';

import { InstanceBootstrappingError } from '../../instance-bootstrapping.error';

const ENV_PROVISIONING_MODES = [
	'disabled',
	'instance_role',
	'instance_and_project_roles',
] as const satisfies readonly ProvisioningMode[];

const modeSchema = z.object({
	ssoUserRoleProvisioning: z.enum(ENV_PROVISIONING_MODES, {
		errorMap: () => ({
			message: `N8N_SSO_USER_ROLE_PROVISIONING must be one of: ${ENV_PROVISIONING_MODES.join(', ')}`,
		}),
	}),
});

@Service()
export class ProvisioningInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async apply(): Promise<void> {
		const parsed = modeSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new InstanceBootstrappingError(parsed.error.issues[0].message);
		}

		const mode = parsed.data.ssoUserRoleProvisioning;
		const { provisioning } = this.globalConfig.sso;

		// Persist the full ProvisioningConfigDto shape. The read path rejects
		// partial rows and silently falls back to disabled defaults.
		const value: ProvisioningConfigDto = {
			scopesProvisionInstanceRole:
				mode === 'instance_role' || mode === 'instance_and_project_roles',
			scopesProvisionProjectRoles: mode === 'instance_and_project_roles',
			scopesUseExpressionMapping: false,
			scopesName: provisioning.scopesName,
			scopesInstanceRoleClaimName: provisioning.scopesInstanceRoleClaimName,
			scopesProjectsRolesClaimName: provisioning.scopesProjectsRolesClaimName,
		};

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(value),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}
}
