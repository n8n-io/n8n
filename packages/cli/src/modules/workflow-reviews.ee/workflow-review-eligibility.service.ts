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

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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
		private readonly workflowFinderService: WorkflowFinderService,
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
	 * the request, mirroring `decide()`'s authorization checks in order (read on the
	 * pinned workflow, then admin / author / assignee) so the surfaced reason matches
	 * the error the endpoint would return. The endpoint remains the source of truth
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
			'request' | 'pinnedWorkflowId' | 'canReadPinnedWorkflow'
		>,
	): Promise<WorkflowReviewViewerEligibility> {
		const { request, pinnedWorkflowId, canReadPinnedWorkflow } = access;

		if (!pinnedWorkflowId) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				canComment: false,
			};
		}

		const [workflow, isAuthor] = await Promise.all([
			this.workflowFinderService.findWorkflowForUser(pinnedWorkflowId, user, ['workflow:read']),
			this.workflowReviewRequestAuthorRepository.isAuthor(
				{ workflowReviewRequestId: request.id, userId: user.id },
				{},
			),
		]);

		if (!workflow) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'missing_permission',
				// Authorship still resolves — an author keeps commenting only while they
				// can still read the pinned workflow.
				canComment: isAuthor ? canReadPinnedWorkflow : false,
			};
		}

		if (await this.hasAdminOverride(user, request.projectId)) {
			return { canDecide: true, decisionIneligibilityReason: null, canComment: true };
		}

		if (isAuthor) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'author',
				canComment: canReadPinnedWorkflow,
			};
		}

		const isAssignedReviewer = await this.workflowReviewRequestReviewerRepository.isReviewer(
			{ workflowReviewRequestId: request.id, userId: user.id },
			{},
		);
		if (!isAssignedReviewer) {
			return {
				canDecide: false,
				decisionIneligibilityReason: 'missing_reviewer_permission',
				canComment: false,
			};
		}

		return { canDecide: true, decisionIneligibilityReason: null, canComment: true };
	}
}
