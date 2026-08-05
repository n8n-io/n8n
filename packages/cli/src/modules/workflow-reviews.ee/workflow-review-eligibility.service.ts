import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';
import {
	ProjectRelationRepository,
	WorkflowReviewRequestAuthorRepository,
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
	reason: WorkflowReviewDecisionIneligibilityReason | null;
	canComment: boolean;
}

/**
 * The viewer-capability rules of a review — who may decide it and who may comment
 * on it — resolved in one pass so the two answers cannot disagree. Shared between
 * the decision endpoint (`WorkflowReviewRequestService.decide`), the comment
 * endpoint and the read side that surfaces both capabilities
 * (`WorkflowReviewInboxService.getDetail`), so none of them can drift.
 */
@Service()
export class WorkflowReviewEligibilityService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
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
	 * the request, mirroring `decide()`'s authorization checks in order (publish on the
	 * pinned workflow first, then authorship) so the surfaced reason matches the error
	 * the endpoint would return. The endpoint remains the source of truth and re-checks
	 * under its lock.
	 *
	 * `canComment` is not advisory: it is the write gate the comment endpoint enforces
	 * verbatim.
	 *
	 * Deliberately viewer-scoped: `decide()`'s `assertRequestUpdatable` lifecycle
	 * guard is not mirrored here. It is shared with the update path and is not
	 * viewer-specific, and folding it in would erase whether the viewer is
	 * eligible at all on a closed request. Callers gate on `state`/`decision`.
	 */
	async resolveViewerEligibility(
		user: User,
		// One object from the read gate, so `canReadPinnedWorkflow` cannot be passed for a
		// different workflow, request or user than the one it was resolved against.
		access: Pick<
			ReadableWorkflowReviewRequest,
			'request' | 'pinnedWorkflowId' | 'canReadPinnedWorkflow'
		>,
	): Promise<WorkflowReviewViewerEligibility> {
		const { request, pinnedWorkflowId, canReadPinnedWorkflow } = access;

		// No linked workflow means decide() would 404 before any permission check, and
		// there is nothing left to discuss either.
		if (!pinnedWorkflowId) {
			return { canDecide: false, reason: 'missing_publish_permission', canComment: false };
		}

		const [workflow, isAuthor] = await Promise.all([
			this.workflowFinderService.findWorkflowForUser(pinnedWorkflowId, user, ['workflow:publish']),
			this.workflowReviewRequestAuthorRepository.isAuthor({
				workflowReviewRequestId: request.id,
				userId: user.id,
			}),
		]);

		// Authorship is history; access is not. An author keeps commenting only while they
		// can still read the pinned workflow — `workflow:read`, not `workflow:publish`, so a
		// personal-project requester is not locked out of their own review.
		const canComment = isAuthor ? canReadPinnedWorkflow : Boolean(workflow);

		if (!workflow) {
			return { canDecide: false, reason: 'missing_publish_permission', canComment };
		}
		if (isAuthor && !(await this.hasAdminOverride(user, request.projectId))) {
			return { canDecide: false, reason: 'author', canComment };
		}

		return { canDecide: true, reason: null, canComment };
	}
}
