import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { DistributiveOmit } from '@n8n/utils/types';
import type { Response } from 'express';

import { isWorkflowReviewsFeatureAvailable } from '@/constants/workflow-reviews';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { SecuritySettingsService } from '@/services/security-settings.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

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
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly licenseState: LicenseState,
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
			workflowReviews,
		] = await Promise.all([
			this.securitySettingsService.arePersonalSpaceSettingsEnabled(),
			this.securitySettingsService.getPublishedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalWorkflowsCount(),
			this.securitySettingsService.getSharedPersonalCredentialsCount(),
			this.instanceRedactionEnforcementService.get(),
			this.getWorkflowReviewsIfAvailable(),
		]);

		return {
			...settings,
			publishedPersonalWorkflowsCount,
			sharedPersonalWorkflowsCount,
			sharedPersonalCredentialsCount,
			managedByEnv: this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv,
			redactionEnforcement: { floor: redactionSettings },
			...(workflowReviews !== undefined ? { workflowReviews } : {}),
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

		if (dto.workflowReviews !== undefined) {
			this.assertWorkflowReviewsAvailable();
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

		if (dto.workflowReviews?.enabled !== undefined) {
			const before = (await this.workflowReviewPolicyService.get()).enabled;
			const after = dto.workflowReviews.enabled;
			updatedSettings.workflowReviews = { enabled: after };
			if (before !== after) {
				const workflowReviews = await this.workflowReviewPolicyService.set(after);
				updatedSettings.workflowReviews = workflowReviews;
				this.emitInstancePolicyUpdated(req, {
					settingName: 'workflow_reviews',
					value: workflowReviews.enabled,
				});
			}
		}

		return updatedSettings;
	}

	private isWorkflowReviewsAvailable(): boolean {
		return isWorkflowReviewsFeatureAvailable(this.licenseState.isWorkflowReviewsLicensed());
	}

	private async getWorkflowReviewsIfAvailable() {
		if (!this.isWorkflowReviewsAvailable()) return undefined;
		return await this.workflowReviewPolicyService.get();
	}

	private assertWorkflowReviewsAvailable(): void {
		if (!this.isWorkflowReviewsAvailable()) {
			throw new ForbiddenError('Workflow reviews settings are not enabled in this instance');
		}
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
