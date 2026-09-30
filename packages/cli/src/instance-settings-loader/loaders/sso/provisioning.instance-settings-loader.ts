import {
	ProvisioningConfigDto,
	type ProvisioningMode,
	type ProvisioningModeFlags,
} from '@n8n/api-types';
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

type EnvProvisioningMode = (typeof ENV_PROVISIONING_MODES)[number];

/**
 * The two env vars are the two settings dropdowns: the mode picks which roles SSO provisions,
 * `N8N_SSO_SCOPES_USE_EXPRESSION_MAPPING` picks how claims map to them. Mirrors
 * `getProvisioningConfigFromDropdowns` in the UI, which collapses the same two choices into
 * these three flags because the two mapping methods are mutually exclusive code paths.
 */
function resolveModeFlags(
	mode: EnvProvisioningMode,
	useExpressionMapping: boolean,
): ProvisioningModeFlags {
	// Roles assigned by hand, so there is nothing for a mapping method to do — the UI hides
	// that dropdown entirely for this option.
	if (mode === 'disabled') {
		return {
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: false,
		};
	}

	// Expression mapping replaces direct-claim provisioning rather than layering on top, so
	// the scopes it covers follow from the rules that exist, not from the mode.
	if (useExpressionMapping) {
		return {
			scopesProvisionInstanceRole: false,
			scopesProvisionProjectRoles: false,
			scopesUseExpressionMapping: true,
		};
	}

	return {
		scopesProvisionInstanceRole: true,
		scopesProvisionProjectRoles: mode === 'instance_and_project_roles',
		scopesUseExpressionMapping: false,
	};
}

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

		if (provisioning.scopesUseExpressionMapping && mode === 'disabled') {
			this.logger.warn(
				'N8N_SSO_SCOPES_USE_EXPRESSION_MAPPING=true has no effect while N8N_SSO_USER_ROLE_PROVISIONING is "disabled", which assigns roles manually. Set it to instance_role or instance_and_project_roles to map roles with rules.',
			);
		}

		// Persist the full ProvisioningConfigDto shape. The read path rejects
		// partial rows and silently falls back to disabled defaults.
		const value: ProvisioningConfigDto = {
			...resolveModeFlags(mode, provisioning.scopesUseExpressionMapping),
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
