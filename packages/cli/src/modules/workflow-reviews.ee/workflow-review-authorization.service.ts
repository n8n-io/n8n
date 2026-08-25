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
	readableWorkflowRows: WorkflowReviewRequestWorkflowDetailRow[];
	pinnedWorkflowId: string | null;
	canReadPinnedWorkflow: boolean;
}

export interface WorkflowReviewViewerEligibility {
	canDecide: boolean;
	decisionIneligibilityReason: WorkflowReviewDecisionIneligibilityReason | null;
	canComment: boolean;
}

/**
 * Who may do what with a review: who counts as its admin, who may see it, and
 * what a viewer who can see it may then do. One service because these are one
 * question asked at three widths — an answer that changes for one changes for
 * all three, and splitting them is what let them drift apart before.
 *
 * The decision rule itself lives in `workflow-review-decision-policy`, kept a
 * pure function over resolved facts so `decide()` and the read side cannot
 * disagree about it.
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
	 * The one place that answer is decided, so what a holder may decide can never
	 * drift from what they can see.
	 *
	 * Limitation: only the built-in global/project admin roles qualify — custom
	 * roles never make someone a review admin.
	 */
	async isAdminForProject(user: User, projectId: string): Promise<boolean> {
		if (this.isGlobalAdmin(user)) {
			return true;
		}

		return (await this.findAdminProjectIds(user)).includes(projectId);
	}

	/** Global admins and owners are admins of every review on the instance. */
	private isGlobalAdmin(user: User): boolean {
		return user.role.slug === GLOBAL_ADMIN_ROLE_SLUG || user.role.slug === GLOBAL_OWNER_ROLE_SLUG;
	}

	/** The projects the user administers, and therefore whose reviews they may decide. */
	private async findAdminProjectIds(user: User): Promise<string[]> {
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, [
			PROJECT_ADMIN_ROLE_SLUG,
		]);
	}

	// #endregion

	// #region Visibility

	/**
	 * Who may see which reviews. Global admins and owners see everything. Project
	 * admins see everything in their projects, so the decide override never applies
	 * to a review its holder cannot see. Everyone else sees only reviews they take
	 * part in, as author or assigned reviewer. Either way they must still be able to
	 * read one of the workflows the review covers.
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
	 * `workflow:read` is the bar for the inbox, and every built-in role granting
	 * `workflow:publish` grants read too, so publishers are covered. A custom role
	 * could grant publish alone — nothing validates that pairing — and its holder
	 * would see nothing here, matching the detail and decide gates.
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

	// #endregion

	// #region Read gate

	/**
	 * The read gate for a single review: whether the caller may see it at all, and
	 * which of its covered workflows they may currently read. Every feature hanging
	 * off a review passes through here before doing anything else.
	 *
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

		// One workflow per review for now, so the only row is the pinned one. Ids are
		// nanoids, so the query's id ordering just makes the pick deterministic.
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

	// #endregion

	// #region Viewer capabilities

	/**
	 * What the viewer may do with a review they can already see — decide it, comment
	 * on it — resolved in one pass so the two answers cannot disagree. Takes the
	 * snapshot {@link findReadableRequestOrFail} returned rather than re-reading:
	 * the `workflow:read` probe behind `canReadPinnedWorkflow` is the same one
	 * `decide()` runs, so running it twice per request bought nothing.
	 *
	 * `canDecide` is an advisory read-time snapshot of {@link resolveDecisionCapability},
	 * the rule `decide()` enforces, so the surfaced reason matches the error the
	 * endpoint would return. Assigned reviewers stay eligible even if they later
	 * submitted a version. The endpoint remains the source of truth and re-checks
	 * under its lock.
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
			this.isAdminForProject(user, request.projectId),
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

	// #endregion
}
