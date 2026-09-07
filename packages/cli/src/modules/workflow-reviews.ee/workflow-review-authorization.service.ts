import type { WorkflowReviewDecisionIneligibilityReason } from '@n8n/api-types';
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

import { resolveDecisionCapability } from './workflow-review-decision-policy';

export interface ReadableWorkflowReviewRequest {
	request: WorkflowReviewRequest;
	workflowRows: WorkflowReviewRequestWorkflowDetailRow[];
	/** The subset of {@link workflowRows} the caller may currently read. */
	readableWorkflowRows: WorkflowReviewRequestWorkflowDetailRow[];
}

export interface WorkflowReviewViewerEligibility {
	canDecide: boolean;
	decisionIneligibilityReason: WorkflowReviewDecisionIneligibilityReason | null;
	canComment: boolean;
}

/**
 * Who may do what with a review: who is its admin, who may see it, and what a
 * viewer may then do. One service because the three answers have to move together
 * — splitting them is what let them drift apart before. The decision rule itself
 * is a pure function in `workflow-review-decision-policy`.
 */
@Service()
export class WorkflowReviewAuthorizationService {
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

	// #region Admin rule

	/**
	 * Admins may decide reviews they authored, and see every review in their scope.
	 * Built-in global and project admin roles only — custom roles never qualify.
	 */
	async isAdminForProject(user: User, projectId: string): Promise<boolean> {
		if (this.isGlobalAdmin(user)) {
			return true;
		}

		return (await this.findAdminProjectIds(user)).includes(projectId);
	}

	private isGlobalAdmin(user: User): boolean {
		return user.role.slug === GLOBAL_ADMIN_ROLE_SLUG || user.role.slug === GLOBAL_OWNER_ROLE_SLUG;
	}

	private async findAdminProjectIds(user: User): Promise<string[]> {
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, [
			PROJECT_ADMIN_ROLE_SLUG,
		]);
	}

	// #endregion

	// #region Visibility

	/**
	 * Admins see every review in their scope, so the decide override never applies to
	 * a review its holder cannot see. Everyone else sees only reviews they take part
	 * in. Both still need read on one of the workflows the review covers.
	 */
	async resolveInboxVisibility(user: User): Promise<InboxVisibility> {
		if (this.isGlobalAdmin(user)) {
			return { scope: 'all' };
		}

		const [adminProjectIds, readableProjectIds, readableWorkflowRoles] = await Promise.all([
			this.findAdminProjectIds(user),
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
	 * `workflow:read` is the bar. Every built-in role with `workflow:publish` grants
	 * read too; a custom project role could grant publish alone — nothing validates
	 * that pairing — and its holder would see nothing here, as on the other gates.
	 *
	 * `null` means every project, sparing global-read callers a per-project bind.
	 */
	private async resolveReadableProjectIds(user: User): Promise<string[] | null> {
		if (hasGlobalScope(user, ['workflow:read'], { mode: 'allOf' })) {
			return null;
		}

		const [teamProjectIds, personalProject] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['workflow:read']),
			// Team projects only above; directly shared workflows hang off the personal one.
			this.projectRepository.getPersonalProjectForUser(user.id),
		]);

		return personalProject ? [...teamProjectIds, personalProject.id] : teamProjectIds;
	}

	// #endregion

	// #region Read gate

	/**
	 * The read gate every review feature passes through: may the caller see this
	 * review, and which of its workflows can they read right now. The inbox rule
	 * narrowed per workflow. 404 rather than 403, so a review's existence never leaks.
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
		// Seeing a review means reading what it covers — requesters included.
		if (workflowRows.length > 0 && readableWorkflowRows.length === 0) {
			throw new NotFoundError('Could not find review request');
		}

		return { request, workflowRows, readableWorkflowRows };
	}

	/**
	 * The repository's inbox visibility for one review: project admin, or takes part
	 * in it. Its other half — reading a covered workflow — is the caller's job, and
	 * keeping both is what stops a listed row from 404ing when opened.
	 */
	private async canAccessRequest(user: User, request: WorkflowReviewRequest): Promise<boolean> {
		const visibility = await this.resolveInboxVisibility(user);
		if (visibility.scope === 'all') {
			return true;
		}

		if (visibility.adminProjectIds.includes(request.projectId)) {
			return true;
		}

		// No separate requester check: `create` always writes their author row.
		const participant = { workflowReviewRequestId: request.id, userId: user.id };
		const [isAuthor, isReviewer] = await Promise.all([
			this.workflowReviewRequestAuthorRepository.isAuthor(participant, {}),
			this.workflowReviewRequestReviewerRepository.isReviewer(participant, {}),
		]);

		return isAuthor || isReviewer;
	}

	/**
	 * {@link canAccessRequest} for a batch, resolved with one visibility lookup and
	 * one probe per junction table instead of per-request queries.
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
	 * A transfer does not close the review, so the stored `projectId` proves nothing
	 * about access today — check each row against the workflow's current owner.
	 * Requesters included: exempting them would let someone who lost access keep
	 * reading versions published after they did.
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

	// #endregion

	// #region Viewer capabilities

	/**
	 * What a viewer may do with a review they can see — decide it, comment on it —
	 * in one pass so the two answers cannot disagree. Reuses the snapshot from
	 * {@link findReadableRequestOrFail}, whose read probe is the one `decide()` runs.
	 *
	 * `canDecide` is advisory: `decide()` re-checks the same rule under its lock.
	 * It answers who, not when — the lifecycle guard is deliberately not mirrored
	 * here, so callers gate on `state`/`decision` themselves.
	 */
	async resolveViewerEligibility(
		user: User,
		access: Pick<
			ReadableWorkflowReviewRequest,
			'request' | 'workflowRows' | 'readableWorkflowRows'
		>,
	): Promise<WorkflowReviewViewerEligibility> {
		const { request, workflowRows, readableWorkflowRows } = access;

		// A decision or comment covers the whole review, so both need read access to
		// every covered workflow.
		const canReadEveryWorkflow =
			workflowRows.length > 0 && readableWorkflowRows.length === workflowRows.length;

		// No participation lookup is worth running without read on every workflow.
		if (!canReadEveryWorkflow) {
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
			this.isAdminForProject(user, request.projectId),
		]);

		const capability = resolveDecisionCapability({
			canReadEveryWorkflow,
			isAuthor,
			isAssignedReviewer,
			hasAdminOverride,
		});

		return {
			canDecide: capability.allowed,
			decisionIneligibilityReason: capability.allowed ? null : capability.reason,
			// Authors keep commenting on a review they may not decide.
			canComment: capability.allowed || isAuthor,
		};
	}

	// #endregion
}
