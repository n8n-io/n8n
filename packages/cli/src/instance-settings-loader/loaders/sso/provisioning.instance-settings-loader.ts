import { type ProvisioningMode, type ProvisioningModeFlags } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
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

const provisioningSchema = z
	.object({
		ssoUserRoleProvisioning: z.enum(ENV_PROVISIONING_MODES, {
			errorMap: () => ({
				message: `N8N_SSO_USER_ROLE_PROVISIONING must be one of: ${ENV_PROVISIONING_MODES.join(', ')}`,
			}),
		}),
	})
	.transform(
		(input): ProvisioningModeFlags => ({
			scopesProvisionInstanceRole:
				input.ssoUserRoleProvisioning === 'instance_role' ||
				input.ssoUserRoleProvisioning === 'instance_and_project_roles',
			scopesProvisionProjectRoles: input.ssoUserRoleProvisioning === 'instance_and_project_roles',
			scopesUseExpressionMapping: false,
		}),
	);

@Service()
export class ProvisioningInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async apply(): Promise<void> {
		const parsed = provisioningSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new InstanceBootstrappingError(parsed.error.issues[0].message);
		}

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(parsed.data),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}
}
