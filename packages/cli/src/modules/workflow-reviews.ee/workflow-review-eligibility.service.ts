import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';
import {
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import type { ReadableWorkflowReviewRequest } from './workflow-review-access.service';
import { WorkflowReviewAdminService } from './workflow-review-admin.service';
import { resolveDecisionCapability } from './workflow-review-decision-policy';

export interface WorkflowReviewViewerEligibility {
	canDecide: boolean;
	decisionIneligibilityReason: WorkflowReviewDecisionIneligibilityReason | null;
	canComment: boolean;
}

/**
 * The viewer-capability rules of a review — who may decide it and who may comment
 * on it — resolved in one pass so the two answers cannot disagree.
 */
@Service()
export class WorkflowReviewEligibilityService {
	constructor(
		private readonly adminService: WorkflowReviewAdminService,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
	) {}

	/**
	 * `canDecide` is an advisory read-time snapshot of {@link resolveDecisionCapability},
	 * the same rule `decide()` enforces, so the surfaced reason matches the error the
	 * endpoint would return. Assigned reviewers stay eligible even if they later
	 * submitted a version. The endpoint remains the source of truth and re-checks
	 * under its lock.
	 *
	 * The read on the pinned workflow comes from the access snapshot the caller
	 * already resolved — the same `workflow:read` probe `decide()` runs, not repeated
	 * here.
	 *
	 * Deliberately viewer-scoped: `decide()`'s `assertRequestUpdatable` lifecycle
	 * guard is not mirrored here. It is shared with the update path and is not
	 * viewer-specific, and folding it in would erase whether the viewer is
	 * eligible at all on a closed request. Callers gate on `state`/`decision`.
	 */
	async resolveViewerEligibility(
		user: User,
		access: Pick<ReadableWorkflowReviewRequest, 'request' | 'canReadPinnedWorkflow'>,
	): Promise<WorkflowReviewViewerEligibility> {
		const { request, canReadPinnedWorkflow } = access;

		// Nobody acts on a review whose pinned version they cannot read, so no
		// participation lookup is worth running.
		if (!canReadPinnedWorkflow) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			};
		}

		const participant = { workflowReviewRequestId: request.id, userId: user.id };
		const [isAuthor, isAssignedReviewer, hasAdminOverride] = await Promise.all([
			this.workflowReviewRequestAuthorRepository.isAuthor(participant, {}),
			this.workflowReviewRequestReviewerRepository.isReviewer(participant, {}),
			this.adminService.isAdminForProject(user, request.projectId),
		]);

		const capability = resolveDecisionCapability({
			canReadPinnedWorkflow,
			isAuthor,
			isAssignedReviewer,
			hasAdminOverride,
		});

		return {
			canDecide: capability.allowed,
			decisionIneligibilityReason: capability.allowed ? null : capability.reason,
			// Authors keep commenting on a review they may not decide; everyone else
			// comments only if they could decide it.
			canComment: capability.allowed || isAuthor,
		};
	}
}
