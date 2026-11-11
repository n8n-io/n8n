import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { ForbiddenError } from '@n8n/errors';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

type WorkflowReviewAvailability = { available: true } | { available: false; errorMessage: string };

/**
 * Single gate for the workflow reviews feature: license and the instance
 * policy. Every entry point of the review services calls it, so a non-HTTP
 * caller is gated too — the controller's `@Licensed` decorator only covers
 * the routes.
 */
@Service()
export class WorkflowReviewFeatureGate {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
	) {}

	/** Review APIs are available when publishing reviews or promotion reviews are on. */
	async isAvailable(): Promise<boolean> {
		return (await this.getAvailability()).available;
	}

	/** The "Enable workflow reviews" control. Gates publishing reviews only. */
	async isPublishingEnabled(): Promise<boolean> {
		if (!this.licenseState.isWorkflowReviewsLicensed()) return false;
		return (await this.workflowReviewPolicyService.get()).enabled === true;
	}

	/** The "Enable promotion reviews" control. Gates promotion reviews only. */
	async isPromotionEnabled(): Promise<boolean> {
		if (!this.licenseState.isWorkflowReviewsLicensed()) return false;
		return (await this.workflowReviewPolicyService.get()).promotionReviewsEnabled === true;
	}

	async assertAvailable(): Promise<void> {
		const availability = await this.getAvailability();
		if (!availability.available) {
			throw new ForbiddenError(availability.errorMessage);
		}
	}

	private async getAvailability(): Promise<WorkflowReviewAvailability> {
		if (!this.licenseState.isWorkflowReviewsLicensed()) {
			return {
				available: false,
				errorMessage: 'Workflow reviews are not available on this instance',
			};
		}

		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled && !policy.promotionReviewsEnabled) {
			return {
				available: false,
				errorMessage: 'Workflow reviews are disabled on this instance',
			};
		}

		return { available: true };
	}
}
