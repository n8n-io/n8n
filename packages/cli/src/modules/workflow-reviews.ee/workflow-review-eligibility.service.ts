import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';
import {
	ProjectRelationRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	GLOBAL_ADMIN_ROLE_SLUG,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
} from '@n8n/permissions';

import type { ReadableWorkflowReviewRequest } from './workflow-review-access.service';

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
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * Admins may decide reviews they authored. Limitation: only the built-in
	 * global/project admin roles qualify — custom roles never grant the override.
	 */
	async hasAdminOverride(user: User, projectId: string): Promise<boolean> {
		if (user.role.slug === GLOBAL_ADMIN_ROLE_SLUG || user.role.slug === GLOBAL_OWNER_ROLE_SLUG) {
			return true;
		}

		const adminProjectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(
			user.id,
			[PROJECT_ADMIN_ROLE_SLUG],
		);
		return adminProjectIds.includes(projectId);
	}

	/**
	 * `canDecide` is an advisory read-time snapshot of whether the viewer could decide
	 * the request, mirroring `decide()`'s authorization checks in order (read on every
	 * covered workflow, then admin / assignee / author) so the surfaced reason matches
	 * the error the endpoint would return. Assigned reviewers stay eligible even if
	 * they later submitted a version. The endpoint remains the source of truth
	 * and re-checks under its lock.
	 *
	 * Deliberately viewer-scoped: `decide()`'s `assertRequestUpdatable` lifecycle
	 * guard is not mirrored here. It is shared with the update path and is not
	 * viewer-specific, and folding it in would erase whether the viewer is
	 * eligible at all on a closed request. Callers gate on `state`/`decision`.
	 */
	async resolveViewerEligibility(
		user: User,
		access: Pick<
			ReadableWorkflowReviewRequest,
			'request' | 'workflowRows' | 'readableWorkflowRows'
		>,
	): Promise<WorkflowReviewViewerEligibility> {
		const { request, workflowRows, readableWorkflowRows } = access;

		// A decision or comment covers the whole review, so both require read access
		// to every covered workflow — no workflow on a review outranks another.
		const canReadEveryWorkflow =
			workflowRows.length > 0 && readableWorkflowRows.length === workflowRows.length;
		if (!canReadEveryWorkflow) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			};
		}

		if (await this.hasAdminOverride(user, request.projectId)) {
			return { canDecide: true, decisionIneligibilityReason: null, canComment: true };
		}

		const isAssignedReviewer = await this.workflowReviewRequestReviewerRepository.isReviewer(
			{ workflowReviewRequestId: request.id, userId: user.id },
			{},
		);
		if (isAssignedReviewer) {
			return { canDecide: true, decisionIneligibilityReason: null, canComment: true };
		}

		const isAuthor = await this.workflowReviewRequestAuthorRepository.isAuthor(
			{ workflowReviewRequestId: request.id, userId: user.id },
			{},
		);
		if (isAuthor) {
			return { canDecide: false, decisionIneligibilityReason: 'author', canComment: true };
		}

		return {
			canDecide: false,
			decisionIneligibilityReason: 'missing_reviewer_permission',
			canComment: false,
		};
	}
}
