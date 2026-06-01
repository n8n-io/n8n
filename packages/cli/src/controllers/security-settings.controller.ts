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
		const redactionEnforcementEnabled = isRedactionEnforcementEnabled();

		const [
			settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			redactionSettings,
		] = await Promise.all([
			this.securitySettingsService.arePersonalSpaceSettingsEnabled(),
			this.securitySettingsService.getPublishedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalCredentialsCount(),
			redactionEnforcementEnabled
				? this.instanceRedactionEnforcementService.get()
				: Promise.resolve(undefined),
		]);

		// API surface uses a single `floor` enum, while the service stores the
		// three booleans the cache layer was built around. Translate at the boundary.
		const redactionEnforcement = redactionSettings
			? { floor: settingsToFloor(redactionSettings) }
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

		const updatedSettings: Partial<UpdateSecuritySettingsDto> = {};
		if (dto.personalSpacePublishing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				dto.personalSpacePublishing,
			);
			updatedSettings.personalSpacePublishing = dto.personalSpacePublishing;
			this.emitInstancePolicyUpdated(req, 'workflow_publishing', dto.personalSpacePublishing);
		}
		if (dto.personalSpaceSharing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_SHARING_SETTING,
				dto.personalSpaceSharing,
			);
			updatedSettings.personalSpaceSharing = dto.personalSpaceSharing;
			this.emitInstancePolicyUpdated(req, 'workflow_sharing', dto.personalSpaceSharing);
		}

		if (dto.redactionEnforcement !== undefined && isRedactionEnforcementEnabled()) {
			const before = await this.instanceRedactionEnforcementService.get();
			const after = floorToSettings(dto.redactionEnforcement.floor);
			updatedSettings.redactionEnforcement = { floor: dto.redactionEnforcement.floor };
			if (
				before.enforced !== after.enforced ||
				before.manual !== after.manual ||
				before.production !== after.production
			) {
				await this.instanceRedactionEnforcementService.set(after);
				this.eventService.emit('redaction-enforcement-updated', {
					user: {
						id: req.user.id,
						email: req.user.email,
						firstName: req.user.firstName,
						lastName: req.user.lastName,
						role: req.user.role,
					},
					before,
					after,
				});
			}
		}

		return updatedSettings;
	}

	private emitInstancePolicyUpdated(
		req: AuthenticatedRequest,
		settingName: '2fa_enforcement' | 'workflow_publishing' | 'workflow_sharing',
		value: boolean,
	) {
		this.eventService.emit('instance-policies-updated', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
			settingName,
			value,
		});
	}
}
