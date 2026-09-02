import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { isWorkflowReviewsFeatureAvailable } from '@/constants/workflow-reviews';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';

type WorkflowReviewAvailability = { available: true } | { available: false; errorMessage: string };

/**
 * Single gate for the workflow reviews feature: license (plus env flag) and the
 * instance policy. Every entry point of the review services calls it, so a
 * non-HTTP caller is gated too — the controller's `@Licensed` decorator only
 * covers the routes.
 */
@Service()
export class WorkflowReviewFeatureGate {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
	) {}

	async isAvailable(): Promise<boolean> {
		return (await this.getAvailability()).available;
	}

	async assertAvailable(): Promise<void> {
		const availability = await this.getAvailability();
		if (!availability.available) {
			throw new ForbiddenError(availability.errorMessage);
		}
	}

	private async getAvailability(): Promise<WorkflowReviewAvailability> {
		if (!isWorkflowReviewsFeatureAvailable(this.licenseState.isWorkflowReviewsLicensed())) {
			return {
				available: false,
				errorMessage: 'Workflow reviews are not available on this instance',
			};
		}

		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			return {
				available: false,
				errorMessage: 'Workflow reviews are disabled on this instance',
			};
		}

		return { available: true };
	}
}
