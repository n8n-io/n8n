import type {
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
	UpdateWorkflowReviewRequestVersionDto,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestList,
	WorkflowReviewRequestSummary,
	ListWorkflowReviewInboxQueryDto,
	ListWorkflowReviewInboxResponse,
	GetWorkflowReviewInboxSummaryResponse,
	WorkflowReviewInboxItem,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowPublishedVersionRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxCursor,
	type User,
	type WorkflowHistory,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestLinkedWorkflow,
	type WorkflowReviewRequestReviewer,
	type WorkflowReviewRequestWorkflowDetailRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	GLOBAL_ADMIN_ROLE_SLUG,
	GLOBAL_OWNER_ROLE_SLUG,
	PROJECT_ADMIN_ROLE_SLUG,
	hasGlobalScope,
} from '@n8n/permissions';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { isWorkflowReviewsFeatureAvailable } from '@/constants/workflow-reviews';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

@Service()
export class WorkflowReviewRequestService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly userRepository: UserRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly projectService: ProjectService,
		private readonly licenseState: LicenseState,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
	) {}

	private async findEligibleReviewers(projectId: string, excludeUserId: string): Promise<User[]> {
		const [projectRoleSlugs, globalRoleSlugs] = await Promise.all([
			this.roleService.rolesWithScope('project', ['workflow:publish']),
			this.roleService.rolesWithScope('global', ['workflow:publish']),
		]);

		const users = await this.userRepository.findEligibleByProjectOrGlobalRoles({
			projectId,
			projectRoleSlugs,
			globalRoleSlugs,
		});

		return users
			.filter((user) => !user.isPending && user.id !== excludeUserId)
			.sort((a, b) => a.email.localeCompare(b.email));
	}

	async list(
		user: User,
		query: ListWorkflowReviewRequestsQueryDto,
	): Promise<WorkflowReviewRequestList> {
		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(query.workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		const [requests, count] = await this.workflowReviewRequestRepository.findRequestsForWorkflow(
			query.workflowId,
			{ state: query.state, skip: query.skip, take: query.take },
		);

		return {
			count,
			data: requests.map((request) => ({
				id: request.id,
				state: request.state,
				decision: request.decision,
				workflowVersionId: request.workflowVersionId,
				createdAt: request.createdAt.toISOString(),
				updatedAt: request.updatedAt.toISOString(),
			})),
		};
	}

	async getEligibleReviewers(
		user: User,
		query: GetWorkflowReviewEligibleReviewersQueryDto,
	): Promise<WorkflowReviewEligibleReviewersList> {
		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(query.workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(query.workflowId);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		const reviewers = await this.findEligibleReviewers(project.id, user.id);

		// No pagination: the set is bounded by the project's members plus instance admins
		return {
			count: reviewers.length,
			data: reviewers.map((reviewer) => this.toEligibleReviewer(reviewer)),
		};
	}

	/** Project a user onto the boundary shape the review endpoints are allowed to expose. */
	private toEligibleReviewer(user: User): WorkflowReviewEligibleReviewer {
		return {
			id: user.id,
			email: user.email,
			firstName: user.firstName ?? null,
			lastName: user.lastName ?? null,
		};
	}

	async create(
		user: User,
		dto: CreateWorkflowReviewRequestDto,
	): Promise<WorkflowReviewRequestSummary> {
		const { workflowId, workflowVersionId } = dto.workflows[0];

		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${workflowId}' is archived and cannot be submitted for review`,
			);
		}

		const version = await this.workflowHistoryService.findVersion(workflowId, workflowVersionId);
		if (!version) {
			throw new BadRequestError(
				`Version '${workflowVersionId}' does not exist for workflow '${workflowId}'`,
			);
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		const reviewerUserIds = [...new Set(dto.reviewerUserIds ?? [])];
		if (reviewerUserIds.length > 0) {
			if (reviewerUserIds.includes(user.id)) {
				throw new BadRequestError('You cannot assign yourself as a reviewer');
			}

			const eligibleIds = new Set(
				(await this.findEligibleReviewers(project.id, user.id)).map((reviewer) => reviewer.id),
			);
			// The requester can already enumerate the eligible set, so listing ids leaks nothing
			const ineligibleIds = reviewerUserIds.filter((id) => !eligibleIds.has(id));
			if (ineligibleIds.length > 0) {
				throw new BadRequestError(
					`These users are not eligible to review this workflow: ${ineligibleIds.join(', ')}`,
				);
			}
		}

		const request = await this.dbLockService.withLock(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (tx) => {
				const existing = await this.workflowReviewRequestRepository.findOpenRequestForWorkflow(
					workflowId,
					tx,
				);
				if (existing) {
					throw new ConflictError(
						'An open review request already exists for this workflow',
						'Update the existing review request instead of creating a new one',
						{ workflowReviewRequestId: existing.id },
					);
				}

				const created = await this.workflowReviewRequestRepository.createRequest(
					{
						projectId: project.id,
						title: dto.title,
						description: dto.description ?? null,
						createdById: user.id,
					},
					tx,
				);

				await this.workflowReviewRequestWorkflowRepository.createWorkflowRow(
					{
						workflowReviewRequestId: created.id,
						workflowId,
						workflowVersionId,
					},
					tx,
				);

				await this.workflowReviewRequestAuthorRepository.addAuthor(
					{ workflowReviewRequestId: created.id, userId: user.id },
					tx,
				);

				if (reviewerUserIds.length > 0) {
					await this.workflowReviewRequestReviewerRepository.addReviewers(
						{ workflowReviewRequestId: created.id, userIds: reviewerUserIds },
						tx,
					);
				}

				return created;
			},
		);

		this.broadcastReviewStateChanged(workflowId);

		return this.toSummary(request, workflowVersionId);
	}

	/**
	 * Re-pin an open review request to another version of the workflow it covers,
	 * preserving its discussion and metadata.
	 */
	async updateVersion(
		user: User,
		workflowReviewRequestId: string,
		dto: UpdateWorkflowReviewRequestVersionDto,
	): Promise<WorkflowReviewRequestSummary> {
		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		const request = await this.workflowReviewRequestRepository.findById(workflowReviewRequestId);
		if (!request) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows =
			await this.workflowReviewRequestWorkflowRepository.findByRequestId(workflowReviewRequestId);
		const workflowRow = workflowRows.find((row) => row.workflowId === dto.workflowId);
		if (!workflowRow) {
			throw new NotFoundError('Could not find review request');
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(dto.workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${dto.workflowId}' is archived and its review cannot be updated`,
			);
		}

		this.assertRequestUpdatable(request);

		const version = await this.workflowHistoryService.findVersion(
			dto.workflowId,
			dto.workflowVersionId,
		);
		if (!version) {
			throw new BadRequestError(
				`Version '${dto.workflowVersionId}' does not exist for workflow '${dto.workflowId}'`,
			);
		}

		// Nothing new to review: skip the lock, write nothing, broadcast nothing.
		// Once decisions exist (LIGO-786) this also means an unchanged version does
		// NOT reset `changes_requested` back to `pending` — which is correct.
		if (workflowRow.workflowVersionId === dto.workflowVersionId) {
			return this.toSummary(request, workflowRow.workflowVersionId);
		}

		const { request: updated, changed } = await this.dbLockService.withLock(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (tx) => {
				// Re-check under the lock so update can't race a concurrent close/approve.
				const current = await this.workflowReviewRequestRepository.findById(
					workflowReviewRequestId,
					tx,
				);
				if (!current) {
					throw new NotFoundError('Could not find review request');
				}
				this.assertRequestUpdatable(current);

				// Re-check the pinned version too: a concurrent identical sync that won
				// the lock already re-pinned — repeating the writes would bump updatedAt,
				// reset the decision, and broadcast for a no-op.
				const currentRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
					workflowReviewRequestId,
					tx,
				);
				const currentRow = currentRows.find((row) => row.workflowId === dto.workflowId);
				if (!currentRow) {
					throw new NotFoundError('Could not find review request');
				}
				if (currentRow.workflowVersionId === dto.workflowVersionId) {
					return { request: current, changed: false };
				}

				await this.workflowReviewRequestWorkflowRepository.updateWorkflowVersion(
					{
						workflowReviewRequestId,
						workflowId: dto.workflowId,
						workflowVersionId: dto.workflowVersionId,
					},
					tx,
				);

				current.decision = 'pending';
				current.updatedById = user.id;
				// save (not update) so @BeforeUpdate bumps updatedAt
				const saved = await tx.save(current);

				await this.workflowReviewRequestAuthorRepository.addAuthorIfMissing(
					{ workflowReviewRequestId, userId: user.id },
					tx,
				);

				return { request: saved, changed: true };
			},
		);

		if (changed) {
			this.broadcastReviewStateChanged(dto.workflowId);
		}

		return this.toSummary(updated, dto.workflowVersionId);
	}

	/**
	 * Decide an open review request: approve (terminal, closes the request) or
	 * request changes (the request stays open awaiting a new version).
	 */
	async decide(
		user: User,
		workflowReviewRequestId: string,
		dto: DecideWorkflowReviewRequestDto,
	): Promise<WorkflowReviewRequestSummary> {
		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		const request = await this.workflowReviewRequestRepository.findById(workflowReviewRequestId);
		if (!request) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows =
			await this.workflowReviewRequestWorkflowRepository.findByRequestId(workflowReviewRequestId);
		const workflowRow = workflowRows[0];
		if (!workflowRow) {
			throw new NotFoundError('Could not find review request');
		}

		// 404 (not 403) so callers without access can't probe which requests exist
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowRow.workflowId,
			user,
			['workflow:publish'],
		);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		this.assertRequestUpdatable(request);

		// Resolved before the lock: this query must not run inside the lock
		// transaction, where it would need a second pooled connection while the
		// transaction holds one — a deadlock on a single-connection pool.
		const hasAdminOverride = await this.hasDecisionAdminOverride(user, request.projectId);

		// Fast path: reject a known author before queueing on the lock.
		const isAuthor = await this.workflowReviewRequestAuthorRepository.isAuthor({
			workflowReviewRequestId,
			userId: user.id,
		});
		this.assertDecisionAllowed(isAuthor, hasAdminOverride);

		const { request: saved, pinnedVersionId } = await this.dbLockService.withLock(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (tx) => {
				// Re-check under the lock so a decision can't race a concurrent
				// version sync (which resets the decision to pending) or another decision.
				const current = await this.workflowReviewRequestRepository.findById(
					workflowReviewRequestId,
					tx,
				);
				if (!current) {
					throw new NotFoundError('Could not find review request');
				}
				this.assertRequestUpdatable(current);

				// Re-check authorship here — a sync that won the lock first has
				// added its syncer to the author set since the pre-lock check, and that
				// syncer must not be able to decide.
				const isAuthorNow = await this.workflowReviewRequestAuthorRepository.isAuthor(
					{ workflowReviewRequestId, userId: user.id },
					tx,
				);
				this.assertDecisionAllowed(isAuthorNow, hasAdminOverride);

				// Re-read the pinned row too: a concurrent sync that won the lock may
				// have re-pinned, and the summary must reflect the version being decided on.
				const currentRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
					workflowReviewRequestId,
					tx,
				);
				const currentRow = currentRows.find((row) => row.workflowId === workflowRow.workflowId);
				if (!currentRow) {
					throw new NotFoundError('Could not find review request');
				}

				current.decision = dto.decision;
				current.updatedById = user.id;
				if (dto.decision === 'approved') {
					current.state = 'closed';
					current.closedById = user.id;
					current.approvedAt = new Date();
				}

				// save (not update) so @BeforeUpdate bumps updatedAt
				const savedRequest = await tx.save(current);
				return { request: savedRequest, pinnedVersionId: currentRow.workflowVersionId };
			},
		);

		this.broadcastReviewStateChanged(workflowRow.workflowId);

		return this.toSummary(saved, pinnedVersionId);
	}

	/**
	 * Authors cannot decide their own review request, unless an admin override
	 * applies. Called before and again inside the decision lock, since the author
	 * set can change while the caller waits for the lock. The override is resolved
	 * once, pre-lock: the lock guards the author set, not role membership — like
	 * every other authorization check in `decide`, roles are evaluated up front.
	 */
	private assertDecisionAllowed(isAuthor: boolean, hasAdminOverride: boolean): void {
		if (isAuthor && !hasAdminOverride) {
			throw new ForbiddenError('Authors cannot decide on their own review request');
		}
	}

	/**
	 * Admins may decide reviews they authored. Limitation: only the built-in
	 * global/project admin roles qualify — custom roles never grant the override.
	 */
	private async hasDecisionAdminOverride(user: User, projectId: string): Promise<boolean> {
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
	 * Fire-and-forget: the transaction has committed, a failed broadcast
	 * must not fail the request. Viewers heal via focus/reconnect refetch.
	 */
	private broadcastReviewStateChanged(workflowId: string): void {
		this.collaborationService
			.broadcastWorkflowReviewStateChanged(workflowId)
			.catch((error) =>
				this.logger.warn('Failed to broadcast review state change', { workflowId, error }),
			);
	}

	/**
	 * A closed or already-approved request can no longer be re-pinned to a new
	 * version, nor decided again — this is what makes approval terminal, so don't
	 * relax it for the re-pin case alone.
	 */
	private assertRequestUpdatable(request: WorkflowReviewRequest): void {
		if (request.state === 'closed' || request.decision === 'approved') {
			throw new ConflictError('The review request is no longer open');
		}
	}

	private toSummary(
		request: WorkflowReviewRequest,
		workflowVersionId: string | null,
	): WorkflowReviewRequestSummary {
		return {
			id: request.id,
			state: request.state,
			decision: request.decision,
			workflowVersionId,
			createdAt: request.createdAt.toISOString(),
			updatedAt: request.updatedAt.toISOString(),
		};
	}

	/**
	 * Cross-project inbox.
	 *
	 * Defaults to open requests when `state` is omitted. Deferred (LIGO-594):
	 * `projectId`, `reviewer`, and `author` filters.
	 */
	async listForInbox(
		user: User,
		query: ListWorkflowReviewInboxQueryDto,
	): Promise<ListWorkflowReviewInboxResponse> {
		await this.assertFeatureAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		const { limit } = query;
		const rows = await this.workflowReviewRequestRepository.findManyForInbox({
			projectIds,
			requesterId: user.id,
			state: query.state ?? 'open',
			limit: limit + 1,
			cursor: query.cursor ? this.decodeInboxCursor(query.cursor) : undefined,
		});

		const hasMore = rows.length > limit;
		const data = rows.slice(0, limit);
		const lastRow = data.at(-1);
		const nextCursor = hasMore && lastRow ? this.encodeInboxCursor(lastRow) : null;
		const requestIds = data.map((row) => row.id);
		const [linkedWorkflowByRequestId, reviewerRows] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds(requestIds),
			this.workflowReviewRequestReviewerRepository.findByRequestIds(requestIds),
		]);

		const participantsByRequestId = await this.hydrateParticipants(data, reviewerRows);

		return {
			data: data.map((row) => {
				const { requester, reviewers } = participantsByRequestId.get(row.id) ?? {
					requester: null,
					reviewers: [],
				};
				return this.toInboxItem(
					row,
					linkedWorkflowByRequestId.get(row.id) ?? null,
					requester,
					reviewers,
				);
			}),
			nextCursor,
			hasMore,
		};
	}

	/**
	 * Batch-resolve the requester and requested reviewers for each request row,
	 * keyed by request id. Deleted users simply drop out of the result.
	 */
	private async hydrateParticipants(
		rows: WorkflowReviewRequest[],
		reviewerRows: WorkflowReviewRequestReviewer[],
	): Promise<
		Map<
			string,
			{
				requester: WorkflowReviewEligibleReviewer | null;
				reviewers: WorkflowReviewEligibleReviewer[];
			}
		>
	> {
		const reviewerIdsByRequestId = new Map<string, string[]>();
		for (const { workflowReviewRequestId, userId } of reviewerRows) {
			const ids = reviewerIdsByRequestId.get(workflowReviewRequestId) ?? [];
			ids.push(userId);
			reviewerIdsByRequestId.set(workflowReviewRequestId, ids);
		}

		const userIds = new Set([
			...rows.map((row) => row.createdById).filter((id) => id !== null),
			...reviewerRows.map((row) => row.userId),
		]);

		const usersById = new Map<string, WorkflowReviewEligibleReviewer>();
		if (userIds.size > 0) {
			for (const user of await this.userRepository.findManyByIds([...userIds])) {
				usersById.set(user.id, this.toEligibleReviewer(user));
			}
		}

		return new Map(
			rows.map((row) => [
				row.id,
				{
					requester: row.createdById ? (usersById.get(row.createdById) ?? null) : null,
					reviewers: (reviewerIdsByRequestId.get(row.id) ?? [])
						.map((userId) => usersById.get(userId))
						.filter((reviewer) => reviewer !== undefined),
				},
			]),
		);
	}

	async getInboxSummaryForUser(user: User): Promise<GetWorkflowReviewInboxSummaryResponse> {
		await this.assertFeatureAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		return await this.workflowReviewRequestRepository.countByStateForInbox({
			projectIds,
			requesterId: user.id,
		});
	}

	/**
	 * Visibility starts from the inbox rule (requester OR `workflow:publish` in the
	 * review's project OR globally), then narrows per workflow to what the caller can
	 * currently read — see {@link filterReadableWorkflowRows}.
	 */
	async getDetail(
		user: User,
		workflowReviewRequestId: string,
	): Promise<WorkflowReviewRequestDetail> {
		await this.assertFeatureAvailable();

		const request = await this.workflowReviewRequestRepository.findById(workflowReviewRequestId);
		if (!request || !(await this.canAccessRequest(user, request))) {
			throw new NotFoundError('Could not find review request');
		}

		const [workflowRows, reviewerRows] = await Promise.all([
			this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowDetailsByRequestId(request.id),
			this.workflowReviewRequestReviewerRepository.findByRequestIds([request.id]),
		]);

		const readableRows = await this.filterReadableWorkflowRows(user, workflowRows);
		// Someone who reaches this review through its project has no reason to learn it
		// exists once they can read none of the workflows it covers. The requester already
		// knows, and their inbox still lists it, so they keep the record — narrowed to the
		// workflows they can currently read.
		if (request.createdById !== user.id && workflowRows.length > 0 && readableRows.length === 0) {
			throw new NotFoundError('Could not find review request');
		}

		const [workflows, participantsByRequestId] = await Promise.all([
			Promise.all(readableRows.map(async (row) => await this.toWorkflowDetail(row))),
			this.hydrateParticipants([request], reviewerRows),
		]);

		const { requester, reviewers } = participantsByRequestId.get(request.id) ?? {
			requester: null,
			reviewers: [],
		};
		return {
			// One workflow per review for now, so the summary fields mirror the first row
			...this.toInboxItem(request, workflows.at(0) ?? null, requester, reviewers),
			description: request.description,
			workflows,
		};
	}

	/** Inbox visibility rule: requester, or `workflow:publish` in the review's project. */
	private async canAccessRequest(user: User, request: WorkflowReviewRequest): Promise<boolean> {
		if (request.createdById === user.id) {
			return true;
		}

		const projectIds = await this.resolveAccessibleProjectIds(user);
		return projectIds === null || projectIds.includes(request.projectId);
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

	/**
	 * Both diff sides for one child row. The baseline is resolved at read time, so
	 * a publish during an open review moves what reviewers are diffing against.
	 */
	private async toWorkflowDetail(
		row: WorkflowReviewRequestWorkflowDetailRow,
	): Promise<WorkflowReviewRequestWorkflowDetail> {
		const publishedVersionId = await this.workflowPublishedVersionRepository.getPublishedVersionId(
			row.workflowId,
		);

		const [pinnedVersion, baselineVersion] = await Promise.all([
			this.findVersionSnapshot(row.workflowId, row.workflowVersionId),
			this.findVersionSnapshot(row.workflowId, publishedVersionId),
		]);

		return {
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowVersionId: row.workflowVersionId,
			pinnedVersion,
			baselineVersion,
		};
	}

	/** `null` version id, or a version whose history row was pruned, both mean "no content". */
	private async findVersionSnapshot(
		workflowId: string,
		versionId: string | null,
	): Promise<WorkflowReviewVersionSnapshot | null> {
		if (!versionId) {
			return null;
		}

		const version = await this.workflowHistoryService.findVersion(workflowId, versionId);
		return version ? this.toVersionSnapshot(version) : null;
	}

	private toVersionSnapshot(version: WorkflowHistory): WorkflowReviewVersionSnapshot {
		return {
			versionId: version.versionId,
			nodes: version.nodes,
			connections: version.connections,
			nodeGroups: version.nodeGroups,
			createdAt: version.createdAt.toISOString(),
		};
	}

	private async assertFeatureAvailable(): Promise<void> {
		if (!isWorkflowReviewsFeatureAvailable(this.licenseState.isWorkflowReviewsLicensed())) {
			throw new ForbiddenError('Workflow reviews are not available on this instance');
		}

		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are disabled on this instance');
		}
	}

	/**
	 * Project IDs for inbox queries. `null` means "all projects, unfiltered" —
	 * correct for users with `workflow:publish` scoped globally. Requesters always
	 * see their own reviews regardless (repository OR-matches `requesterId`), so no
	 * personal-project fallback is needed.
	 */
	async resolveAccessibleProjectIds(user: User): Promise<string[] | null> {
		if (hasGlobalScope(user, 'workflow:publish')) {
			return null;
		}

		return await this.projectService.getProjectIdsWithScope(user, ['workflow:publish']);
	}

	/**
	 * Encode the keyset boundary (createdAt + id) into an opaque cursor so the
	 * next page is resolved without re-reading the anchor row — a review deleted
	 * between requests no longer truncates the rest of the inbox.
	 */
	private encodeInboxCursor(row: WorkflowReviewRequest): string {
		return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, 'utf8').toString('base64url');
	}

	private decodeInboxCursor(cursor: string): InboxCursor {
		const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
		const separatorIndex = decoded.indexOf('|');
		if (separatorIndex === -1) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		const createdAt = new Date(decoded.slice(0, separatorIndex));
		const id = decoded.slice(separatorIndex + 1);
		if (id.length === 0 || Number.isNaN(createdAt.getTime())) {
			throw new BadRequestError('Invalid pagination cursor');
		}

		return { createdAt, id };
	}

	private toInboxItem(
		entity: WorkflowReviewRequest,
		linkedWorkflow: WorkflowReviewRequestLinkedWorkflow | null,
		requester: WorkflowReviewEligibleReviewer | null,
		reviewers: WorkflowReviewEligibleReviewer[],
	): WorkflowReviewInboxItem {
		return {
			id: entity.id,
			projectId: entity.projectId,
			title: entity.title,
			workflowName: linkedWorkflow?.workflowName ?? null,
			workflowVersionId: linkedWorkflow?.workflowVersionId ?? null,
			decision: entity.decision,
			state: entity.state,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
			requester,
			reviewers,
		};
	}
}
