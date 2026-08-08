import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { isWorkflowReviewsFeatureAvailable } from '@/constants/workflow-reviews';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SecuritySettingsService } from '@/services/security-settings.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly licenseState: LicenseState,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	@Licensed('feat:personalSpacePolicy')
	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		const [settings, workflowReviews] = await Promise.all([
			this.securitySettingsService.getSecuritySettings(),
			this.getWorkflowReviewsIfAvailable(),
		]);

		return {
			...settings,
			managedByEnv: this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv,
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

		const updatedSettings: Partial<UpdateSecuritySettingsDto> =
			await this.securitySettingsService.updateSecuritySettings(
				{
					personalSpacePublishing: dto.personalSpacePublishing,
					personalSpaceSharing: dto.personalSpaceSharing,
					redactionEnforcement: dto.redactionEnforcement,
				},
				req.user,
			);

		if (dto.workflowReviews?.enabled !== undefined) {
			const before = (await this.workflowReviewPolicyService.get()).enabled;
			const after = dto.workflowReviews.enabled;
			updatedSettings.workflowReviews = { enabled: after };
			if (before !== after) {
				const workflowReviews = await this.workflowReviewPolicyService.set(after);
				updatedSettings.workflowReviews = workflowReviews;
				this.securitySettingsService.emitInstancePolicyUpdated(req.user, {
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
}
