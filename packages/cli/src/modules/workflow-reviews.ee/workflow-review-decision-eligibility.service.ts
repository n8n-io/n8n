import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';
import {
	ProjectRelationRepository,
	WorkflowReviewRequestAuthorRepository,
	type User,
	type WorkflowReviewRequest,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	GLOBAL_ADMIN_ROLE_SLUG,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
} from '@n8n/permissions';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

export interface WorkflowReviewViewerEligibility {
	canDecide: boolean;
	reason: WorkflowReviewDecisionIneligibilityReason | null;
}

/**
 * Decision-eligibility rules shared between the decision endpoint
 * (`WorkflowReviewRequestService.decide`) and the read side that surfaces the
 * `viewerCanDecide` capability (`WorkflowReviewInboxService.getDetail`), so
 * the two cannot drift.
 */
@Service()
export class WorkflowReviewDecisionEligibilityService {
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
	 * Advisory read-time snapshot of whether the viewer could decide the request,
	 * mirroring `decide()`'s authorization checks in order (publish on the pinned
	 * workflow first, then authorship) so the surfaced reason matches the error
	 * the endpoint would return. The endpoint remains the source of truth and
	 * re-checks under its lock.
	 *
	 * Deliberately viewer-scoped: `decide()`'s `assertRequestUpdatable` lifecycle
	 * guard is not mirrored here. It is shared with the update path and is not
	 * viewer-specific, and folding it in would erase whether the viewer is
	 * eligible at all on a closed request. Callers gate on `state`/`decision`.
	 */
	async resolveViewerEligibility(
		user: User,
		request: WorkflowReviewRequest,
		pinnedWorkflowId: string | null,
	): Promise<WorkflowReviewViewerEligibility> {
		// No linked workflow means decide() would 404 before any permission check
		if (!pinnedWorkflowId) {
			return { canDecide: false, reason: 'missing_publish_permission' };
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(pinnedWorkflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			return { canDecide: false, reason: 'missing_publish_permission' };
		}

		const isAuthor = await this.workflowReviewRequestAuthorRepository.isAuthor(
			{ workflowReviewRequestId: request.id, userId: user.id },
			{},
		);
		if (isAuthor && !(await this.hasAdminOverride(user, request.projectId))) {
			return { canDecide: false, reason: 'author' };
		}

		return { canDecide: true, reason: null };
	}
}
