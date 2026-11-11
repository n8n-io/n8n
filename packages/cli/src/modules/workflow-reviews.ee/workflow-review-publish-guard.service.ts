import type { WorkflowPublishBlockedReason } from '@n8n/api-types';
import { WorkflowRepository, WorkflowReviewRequestRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import type { WorkflowPublishGuard } from '@n8n/backend-services';

import { WorkflowReviewEnforcementService } from './workflow-review-enforcement.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

@Service()
export class WorkflowReviewPublishGuard implements WorkflowPublishGuard {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly enforcement: WorkflowReviewEnforcementService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async assertCanPublish(workflowId: string, versionId?: string): Promise<void> {
		if (!(await this.featureGate.isPublishingEnabled())) return;

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

		if (!(await this.enforcement.publishingRequired(workflowId))) return;

		const version = versionId ?? (await this.currentVersionId(workflowId));
		const approved =
			version !== undefined && (await this.enforcement.hasApprovedReview(workflowId, version));
		if (!approved) {
			throw new WorkflowPublishBlockedError({ reason: 'approval_required' });
		}
	}

	private async currentVersionId(workflowId: string): Promise<string | undefined> {
		const workflow = await this.workflowRepository.findOne({
			select: ['id', 'versionId'],
			where: { id: workflowId },
		});
		return workflow?.versionId;
	}
}
