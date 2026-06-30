import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { DistributiveOmit } from '@n8n/utils/types';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

/**
 * The `instance-policies-updated` payload without the `user` envelope. Kept as a
 * distributed union so each `settingName` stays bound to its own `value` type
 * (boolean settings cannot be emitted with a redaction floor, and vice versa).
 */
type InstancePolicyUpdate = DistributiveOmit<RelayEventMap['instance-policies-updated'], 'user'>;

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
			redactionSettings,
		] = await Promise.all([
			this.securitySettingsService.arePersonalSpaceSettingsEnabled(),
			this.securitySettingsService.getPublishedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalCredentialsCount(),
			this.instanceRedactionEnforcementService.get(),
		]);

		return {
			...settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			managedByEnv: this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv,
			redactionEnforcement: { floor: redactionSettings },
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
			this.emitInstancePolicyUpdated(req, {
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
			this.emitInstancePolicyUpdated(req, {
				settingName: 'workflow_sharing',
				value: dto.personalSpaceSharing,
			});
		}

		if (dto.redactionEnforcement !== undefined) {
			const before = await this.instanceRedactionEnforcementService.get();
			const after = dto.redactionEnforcement.floor;
			updatedSettings.redactionEnforcement = { floor: after };
			if (before !== after) {
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
				// Report the redaction enforcement floor alongside the other instance
				// policies. `'off' | 'production' | 'all'` captures both adoption
				// (off vs not) and scope (production vs production+manual).
				this.emitInstancePolicyUpdated(req, {
					settingName: 'data_redaction_enforcement_floor',
					value: after,
				});
			}
		}

		return updatedSettings;
	}

	private emitInstancePolicyUpdated(req: AuthenticatedRequest, update: InstancePolicyUpdate) {
		this.eventService.emit('instance-policies-updated', {
			user: {
				id: req.user.id,
				email: req.user.email,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				role: req.user.role,
			},
			...update,
		});
	}
}
