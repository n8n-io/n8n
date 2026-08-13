import {
	ProjectRelationRepository,
	ProjectRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxVisibility,
	type User,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	GLOBAL_ADMIN_ROLE_SLUG,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
	hasGlobalScope,
} from '@n8n/permissions';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

export interface ReadableWorkflowReviewRequest {
	request: WorkflowReviewRequest;
	readableWorkflowRows: WorkflowReviewRequestWorkflowDetailRow[];
	pinnedWorkflowId: string | null;
	canReadPinnedWorkflow: boolean;
}

/**
 * The read gate for a single review: whether the caller may see it at all, and which of its
 * covered workflows they may currently read. Every feature hanging off a review passes
 * through here before doing anything else.
 */
@Service()
export class WorkflowReviewAccessService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
	) {}

	/**
	 * Who may see which reviews: global admins/owners see everything, project admins
	 * see everything in their projects (so the decide override never applies to a
	 * review its holder cannot see), and everyone else sees only reviews they are
	 * involved in — as author (the requester included) or assigned reviewer. Both
	 * paths further require read access to one of the workflows the review covers.
	 *
	 * Built-in role slugs only, matching the eligibility service's admin override.
	 */
	async resolveInboxVisibility(user: User): Promise<InboxVisibility> {
		if (user.role.slug === GLOBAL_ADMIN_ROLE_SLUG || user.role.slug === GLOBAL_OWNER_ROLE_SLUG) {
			return { scope: 'all' };
		}

		const [adminProjectIds, readableProjectIds, readableWorkflowRoles] = await Promise.all([
			this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, [
				PROJECT_ADMIN_ROLE_SLUG,
			]),
			this.resolveReadableProjectIds(user),
			this.roleService.rolesWithScope('workflow', ['workflow:read']),
		]);

		return {
			scope: 'involved',
			userId: user.id,
			adminProjectIds,
			readableProjectIds,
			readableWorkflowRoles,
		};
	}

	/**
	 * A custom global role granting `workflow:read` reads every project, so
	 * return `null` (unrestricted) instead of enumerating every project on the
	 * instance into an `IN (...)` list on every inbox query.
	 */
	private async resolveReadableProjectIds(user: User): Promise<string[] | null> {
		if (hasGlobalScope(user, ['workflow:read'], { mode: 'allOf' })) {
			return null;
		}

		const [teamProjectIds, personalProject] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['workflow:read']),
			// `getProjectIdsWithScope` covers team projects only, but workflows shared
			// directly to the caller hang off their personal project.
			this.projectRepository.getPersonalProjectForUser(user.id),
		]);

		return personalProject ? [...teamProjectIds, personalProject.id] : teamProjectIds;
	}

	/**
	 * Visibility starts from the inbox rule (see {@link resolveInboxVisibility}),
	 * then narrows per workflow to what the caller can currently read — see
	 * {@link filterReadableWorkflowRows}. Throws `NotFoundError` rather than a 403
	 * so a review's existence never leaks.
	 */
	async findReadableRequestOrFail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<ReadableWorkflowReviewRequest> {
		const request = await this.workflowReviewRequestRepository.findById(
			workflowReviewRequestId,
			{},
		);
		if (!request || !(await this.canAccessRequest(user, request))) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows =
			await this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowDetailsByRequestId(
				request.id,
			);
		const readableWorkflowRows = await this.filterReadableWorkflowRows(user, workflowRows);
		// Whoever reached this review has nothing to see once they can read none of the
		// workflows it covers — requesters included: seeing a review requires still
		// holding read on what it reviews.
		if (workflowRows.length > 0 && readableWorkflowRows.length === 0) {
			throw new NotFoundError('Could not find review request');
		}

		// Rows come back id ASC, so the first is the pinned one.
		const pinnedWorkflowId = workflowRows.at(0)?.workflowId ?? null;
		return {
			request,
			readableWorkflowRows,
			pinnedWorkflowId,
			canReadPinnedWorkflow: readableWorkflowRows.some(
				(row) => row.workflowId === pinnedWorkflowId,
			),
		};
	}

	/**
	 * Mirrors the SQL predicate in the repository's inbox visibility for one review:
	 * project admin, or participant. The predicate's other half — read access to a
	 * covered workflow — is enforced by {@link filterReadableWorkflowRows} in the
	 * caller, so the two gates stay equivalent and a listed row never 404s on open.
	 */
	private async canAccessRequest(user: User, request: WorkflowReviewRequest): Promise<boolean> {
		const visibility = await this.resolveInboxVisibility(user);
		if (visibility.scope === 'all') {
			return true;
		}

		if (visibility.adminProjectIds.includes(request.projectId)) {
			return true;
		}

		// No separate requester check: `create` writes the requester's author row in the
		// same transaction as the review, and nothing ever removes one.
		const participant = { workflowReviewRequestId: request.id, userId: user.id };
		const [isAuthor, isReviewer] = await Promise.all([
			this.workflowReviewRequestAuthorRepository.isAuthor(participant, {}),
			this.workflowReviewRequestReviewerRepository.isReviewer(participant, {}),
		]);

		return isAuthor || isReviewer;
	}

	/**
	 * A review's `projectId` is fixed at creation and nothing closes open reviews when a
	 * workflow is transferred, so the stored project does not prove the caller may still
	 * read a covered workflow. Re-check every row against the workflow's *current* owner
	 * before returning its content.
	 *
	 * This applies to the requester too. They held publish rights when they opened the
	 * review, but may have lost them since — and because the baseline is resolved at read
	 * time, an exemption would leave them reading versions published after they lost
	 * access.
	 */
	private async filterReadableWorkflowRows(
		user: User,
		rows: WorkflowReviewRequestWorkflowDetailRow[],
	): Promise<WorkflowReviewRequestWorkflowDetailRow[]> {
		const readable = await Promise.all(
			rows.map(async (row) =>
				(await this.workflowFinderService.findWorkflowForUser(row.workflowId, user, [
					'workflow:read',
				]))
					? row
					: null,
			),
		);

		return readable.filter((row): row is WorkflowReviewRequestWorkflowDetailRow => row !== null);
	}
}
