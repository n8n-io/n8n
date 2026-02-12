import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { Response } from 'express';

import { EventService } from '@/events/event.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly eventService: EventService,
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
		return {
			...settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
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
		const updatedSettings: Record<string, boolean> = {};
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

		return updatedSettings;
	}
}
