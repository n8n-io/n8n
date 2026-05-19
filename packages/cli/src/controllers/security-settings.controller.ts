import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { isRedactionEnforcementEnabled } from '@/modules/redaction/redaction-enforcement.feature-flag';
import { SecuritySettingsService } from '@/services/security-settings.service';

import { floorToSettings, settingsToFloor } from './redaction-enforcement-mapper';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly eventService: EventService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly instanceRedactionEnforcementService: InstanceRedactionEnforcementService,
	) {}

	@Licensed('feat:personalSpacePolicy')
	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		const [
			settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
		] = await Promise.all([
			this.securitySettingsService.arePersonalSpaceSettingsEnabled(),
			this.securitySettingsService.getPublishedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalCredentialsCount(),
		]);

		const redactionEnforcement = isRedactionEnforcementEnabled()
			? { floor: settingsToFloor(await this.instanceRedactionEnforcementService.get()) }
			: undefined;

		return {
			...settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			managedByEnv: this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv,
			...(redactionEnforcement ? { redactionEnforcement } : {}),
		};
	}

	@Licensed('feat:personalSpacePolicy')
	@GlobalScope('securitySettings:manage')
	@Post('/')
	async updateSecuritySettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateSecuritySettingsDto,
	) {
		if (this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv) {
			throw new ForbiddenError(
				'Security settings are managed via environment variables and cannot be modified through the API',
			);
		}

		const updatedSettings: Record<string, unknown> = {};
		if (dto.personalSpacePublishing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				dto.personalSpacePublishing,
			);
			updatedSettings.personalSpacePublishing = dto.personalSpacePublishing;

			this.eventService.emit('instance-policies-updated', {
				user: {
					id: req.user.id,
					email: req.user.email,
					firstName: req.user.firstName,
					lastName: req.user.lastName,
					role: req.user.role,
				},
				settingName: 'workflow_publishing',
				value: dto.personalSpacePublishing,
			});
		}
		if (dto.personalSpaceSharing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_SHARING_SETTING,
				dto.personalSpaceSharing,
			);
			updatedSettings.personalSpaceSharing = dto.personalSpaceSharing;

			this.eventService.emit('instance-policies-updated', {
				user: {
					id: req.user.id,
					email: req.user.email,
					firstName: req.user.firstName,
					lastName: req.user.lastName,
					role: req.user.role,
				},
				settingName: 'workflow_sharing',
				value: dto.personalSpaceSharing,
			});
		}

		if (dto.redactionEnforcement !== undefined && isRedactionEnforcementEnabled()) {
			await this.instanceRedactionEnforcementService.set(
				floorToSettings(dto.redactionEnforcement.floor),
			);
			updatedSettings.redactionEnforcement = { floor: dto.redactionEnforcement.floor };
		}

		return updatedSettings;
	}
}
