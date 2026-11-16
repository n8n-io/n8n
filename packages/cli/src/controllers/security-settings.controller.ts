import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@n8n/errors';
import { SecuritySettingsService } from '@/services/security-settings.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

const MISSING_LICENSE_MESSAGE = 'Plan lacks license for this feature';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly licenseState: LicenseState,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		this.assertAnySettingsLicensed();

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

	@GlobalScope('securitySettings:manage')
	@Post('/')
	async updateSecuritySettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateSecuritySettingsDto,
	) {
		this.assertAnySettingsLicensed();

		if (this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv) {
			throw new ForbiddenError(
				'Security settings are managed via environment variables and cannot be modified through the API',
			);
		}

		const { workflowReviews, ...otherFields } = dto;
		if (
			Object.values(otherFields).some((value) => value !== undefined) &&
			!this.licenseState.isPersonalSpacePolicyLicensed()
		) {
			throw new ForbiddenError(MISSING_LICENSE_MESSAGE);
		}

		if (workflowReviews !== undefined) {
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

		if (workflowReviews !== undefined) {
			const before = await this.workflowReviewPolicyService.get();
			const after = await this.workflowReviewPolicyService.update(workflowReviews);
			updatedSettings.workflowReviews = after;

			if (before.enabled !== after.enabled) {
				this.securitySettingsService.emitInstancePolicyUpdated(req.user, {
					settingName: 'workflow_reviews',
					value: after.enabled,
				});
			}

			const alwaysRequired = after.alwaysRequired === true;
			if ((before.alwaysRequired === true) !== alwaysRequired) {
				this.securitySettingsService.emitInstancePolicyUpdated(req.user, {
					settingName: 'workflow_reviews_approval_required',
					value: alwaysRequired,
				});
			}
		}

		return updatedSettings;
	}

	private isWorkflowReviewsAvailable(): boolean {
		return (
			this.licenseState.isWorkflowReviewsLicensed() &&
			this.moduleRegistry.isActive('workflow-reviews')
		);
	}

	private assertAnySettingsLicensed(): void {
		if (!this.licenseState.isPersonalSpacePolicyLicensed() && !this.isWorkflowReviewsAvailable()) {
			throw new ForbiddenError(MISSING_LICENSE_MESSAGE);
		}
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
