import type { ProvisioningConfigDto, ProvisioningModeFlags } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AuthenticatedRequest, type User } from '@n8n/db';
import { Get, GlobalScope, Patch, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { ForbiddenError } from '@n8n/errors';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';

import { ProvisioningService } from './provisioning.service.ee';
import { RoleMappingRuleService } from './role-mapping-rule.service.ee';

type AssignmentMethod = RelayEventMap['provisioning-settings-updated']['assignmentMethod'];

/**
 * Mirrors `getDropdownValuesFromConfig` in the settings page, so that the
 * instance and the browser report the same value for the same settings.
 * Expression mapping is one toggle for both scopes, so with it project roles
 * count as provisioned only when project rules exist.
 */
function getAssignmentMethod(
	config: ProvisioningModeFlags,
	projectRuleCount: number,
): AssignmentMethod {
	if (config.scopesProvisionInstanceRole) {
		return config.scopesProvisionProjectRoles ? 'instance_and_project_roles' : 'instance_role';
	}

	if (config.scopesUseExpressionMapping) {
		return projectRuleCount > 0 ? 'instance_and_project_roles' : 'instance_role';
	}

	return 'disabled';
}

@RestController('/sso/provisioning')
export class ProvisioningController {
	constructor(
		private readonly provisioningService: ProvisioningService,
		private readonly licenseState: LicenseState,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly roleMappingRuleService: RoleMappingRuleService,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	@Get('/config')
	@GlobalScope('provisioning:manage')
	async getConfig(_req: AuthenticatedRequest, res: Response) {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		return await this.provisioningService.getConfig();
	}

	@Patch('/config')
	@GlobalScope('provisioning:manage')
	async patchConfig(req: AuthenticatedRequest, res: Response) {
		if (!this.licenseState.isProvisioningLicensed()) {
			return res.status(403).json({ message: 'Provisioning is not licensed' });
		}

		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ForbiddenError(
				'Provisioning configuration is managed via environment variables and cannot be modified through the API',
			);
		}

		const config = await this.provisioningService.patchConfig(req.body);
		await this.reportSettingsSaved(req.user, config);
		return config;
	}

	/**
	 * Reported after the save, so a rejected request leaves no record of a
	 * save that never happened. The save deletes stale project rules, so the
	 * counts come after it too. The save is committed at this point, so a
	 * failed count read is logged and must not fail the request.
	 */
	private async reportSettingsSaved(user: User, config: ProvisioningConfigDto) {
		try {
			const ruleCounts = await this.roleMappingRuleService.countByType();
			this.eventService.emit('provisioning-settings-updated', {
				user,
				authenticationMethod: getCurrentAuthenticationMethod(),
				assignmentMethod: getAssignmentMethod(config, ruleCounts.project),
				roleMappingMethod: config.scopesUseExpressionMapping
					? 'n8n_rule_mapping'
					: 'idp_rule_mapping',
				instanceRuleCount: ruleCounts.instance,
				projectRuleCount: ruleCounts.project,
			});
		} catch (error) {
			this.logger.error('Provisioning settings were saved but the save was not reported', {
				error,
			});
		}
	}
}
