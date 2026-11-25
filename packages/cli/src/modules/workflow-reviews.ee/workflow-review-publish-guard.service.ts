import type { WorkflowPublishBlockedReason } from '@n8n/api-types';
import { WorkflowReviewRequestRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import type { WorkflowPublishGuard, WorkflowPublishTarget } from '@n8n/backend-services';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { WorkflowReviewRequirementService } from './workflow-review-requirement.service';

@Service()
export class WorkflowReviewPublishGuard implements WorkflowPublishGuard {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly requirementService: WorkflowReviewRequirementService,
	) {}

	/**
	 * An open review blocks every publish. A source control pull is blocked only by an open review.
	 * When the instance or the project requires it, a team project version also needs an approved review.
	 */
	async assertCanPublish(workflowId: string, target: WorkflowPublishTarget): Promise<void> {
		if (!(await this.featureGate.isAvailable())) return;

		const request = await this.workflowReviewRequestRepository.findOpenRequestForWorkflow(
			workflowId,
			{},
		);
		if (request) {
			const reason: WorkflowPublishBlockedReason =
				request.decision === 'changes_requested' ? 'changes_requested' : 'review_pending';

			throw new WorkflowPublishBlockedError({
				reason,
				workflowReviewRequestId: request.id,
			});
		}

		if (target.fromSourceControlPull) return;
		if ((await this.requirementService.getReviewRequirement(workflowId)) === null) return;
		if (
			await this.workflowReviewRequestRepository.hasApprovedReviewForVersion(
				workflowId,
				target.versionId,
				{},
			)
		) {
			return;
		}

		throw new WorkflowPublishBlockedError({
			reason: 'review_required',
			versionId: target.versionId,
		});
	}
}
