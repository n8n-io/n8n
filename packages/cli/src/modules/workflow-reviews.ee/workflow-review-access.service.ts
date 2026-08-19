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
	 * Who may see which reviews. Global admins and owners see everything. Project
	 * admins see everything in their projects, so the decide override never applies
	 * to a review its holder cannot see. Everyone else sees only reviews they take
	 * part in, as author or assigned reviewer. Either way they must still be able to
	 * read one of the workflows the review covers.
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
	 * `workflow:read` is the bar for the inbox, and every role granting
	 * `workflow:publish` grants read too, so publishers are covered.
	 *
	 * A custom global role with read sees every project, so return `null` for those
	 * callers instead of binding one parameter per project on every inbox query.
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
		// Nothing left to show once the caller can read none of the covered workflows.
		// This applies to requesters too: seeing a review means reading what it covers.
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
	 * Mirrors the repository's inbox visibility for one review: project admin, or
	 * takes part in it. The other half of that rule, reading a covered workflow, is
	 * checked by {@link filterReadableWorkflowRows} in the caller. Keeping both
	 * halves is what stops a listed row from 404ing when opened.
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
	 * {@link canAccessRequest} for a batch: which of the given reviews the user may
	 * open. Same rule — project admin or participant — resolved with one visibility
	 * lookup and one batched probe per junction table instead of per-request queries.
	 * The other half of the rule, reading a covered workflow, is the caller's job.
	 */
	async resolveOpenableRequestIds(
		user: User,
		requests: Array<{ id: string; projectId: string }>,
	): Promise<Set<string>> {
		if (requests.length === 0) {
			return new Set();
		}

		const visibility = await this.resolveInboxVisibility(user);
		if (visibility.scope === 'all') {
			return new Set(requests.map((request) => request.id));
		}

		// Set membership, not `includes`: this runs once per request in the batch.
		const adminProjectIds = new Set(visibility.adminProjectIds);
		const openable = new Set(
			requests
				.filter((request) => adminProjectIds.has(request.projectId))
				.map((request) => request.id),
		);

		const remainingIds = requests.map((request) => request.id).filter((id) => !openable.has(id));
		if (remainingIds.length > 0) {
			const [authoredIds, reviewingIds] = await Promise.all([
				this.workflowReviewRequestAuthorRepository.findRequestIdsForUser(remainingIds, user.id),
				this.workflowReviewRequestReviewerRepository.findRequestIdsForUser(remainingIds, user.id),
			]);
			for (const id of authoredIds) openable.add(id);
			for (const id of reviewingIds) openable.add(id);
		}

		return openable;
	}

	/**
	 * A review's `projectId` is set once at creation and transferring a workflow does
	 * not close the review, so the stored project proves nothing about current access.
	 * Check every row against the workflow's owner today before returning its content.
	 *
	 * Requesters are checked too. They could publish when they opened the review but
	 * may have lost that since, and exempting them would let them read versions
	 * published after they lost access.
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
