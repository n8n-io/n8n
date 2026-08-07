import type {
	CreateWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestDto,
	DecideWorkflowReviewRequestResponse,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
	UpdateWorkflowReviewRequestVersionDto,
	WorkflowReviewApprovedPublicationState,
	WorkflowReviewAutoPublishOutcome,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestForWorkflow,
	WorkflowReviewRequestList,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type OperationContext,
	type User,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestForWorkflowRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { RoleService } from '@/services/role.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowReviewDecisionEligibilityService } from './workflow-review-decision-eligibility.service';
import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';
import { toEligibleReviewer } from './workflow-review.mapper';

/** Omitted stays omitted (column untouched); an empty/whitespace string clears to null. */
function normalizeVersionDescription(description: string | undefined): string | null | undefined {
	if (description === undefined) return undefined;
	return description.trim() || null;
}

/**
 * The workflow-scoped review request lifecycle: listing a workflow's reviews,
 * resolving its eligible reviewers, opening a review, re-pinning it to a new
 * version, and deciding it. The reviewer-facing read side lives in
 * `WorkflowReviewInboxService`.
 */
@Service()
export class WorkflowReviewRequestService {
	constructor(
		private readonly logger: Logger,
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly userRepository: UserRepository,
		private readonly decisionEligibilityService: WorkflowReviewDecisionEligibilityService,
		private readonly roleService: RoleService,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
		private readonly workflowService: WorkflowService,
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
		await this.featureGate.assertAvailable();

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
			data: await this.toWorkflowScopedItems(query.workflowId, requests),
		};
	}

	private async toWorkflowScopedItems(
		workflowId: string,
		requests: WorkflowReviewRequestForWorkflowRow[],
	): Promise<WorkflowReviewRequestForWorkflow[]> {
		const [decisionActors, publicationStates] = await Promise.all([
			this.resolveDecisionActors(requests),
			this.resolveApprovedPublicationStates(workflowId, requests),
		]);

		return requests.map((request) => ({
			id: request.id,
			state: request.state,
			decision: request.decision,
			workflowVersionId: request.workflowVersionId,
			createdAt: request.createdAt.toISOString(),
			updatedAt: request.updatedAt.toISOString(),
			decisionBy: this.pickDecisionActor(request, decisionActors),
			approvedVersionPublicationState: this.pickApprovedPublicationState(
				request,
				publicationStates,
			),
		}));
	}

	/**
	 * `updatedById` is whoever last wrote the request, which for a
	 * `changes_requested` review is the reviewer who made that decision. Any other
	 * decision has no actor to name: `pending` may just be a version re-pin, and
	 * approval is not surfaced with an actor.
	 */
	private async resolveDecisionActors(
		requests: WorkflowReviewRequestForWorkflowRow[],
	): Promise<Map<string, WorkflowReviewEligibleReviewer>> {
		const actorIds = [
			...new Set(
				requests.flatMap((request) =>
					request.decision === 'changes_requested' && request.updatedById
						? [request.updatedById]
						: [],
				),
			),
		];
		if (actorIds.length === 0) {
			return new Map();
		}

		const actors = await this.userRepository.findManyByIds(actorIds);
		return new Map(actors.map((actor) => [actor.id, toEligibleReviewer(actor)]));
	}

	private pickDecisionActor(
		request: WorkflowReviewRequestForWorkflowRow,
		actors: Map<string, WorkflowReviewEligibleReviewer>,
	): WorkflowReviewEligibleReviewer | null {
		if (request.decision !== 'changes_requested' || !request.updatedById) {
			return null;
		}

		return actors.get(request.updatedById) ?? null;
	}

	private async resolveApprovedPublicationStates(
		workflowId: string,
		requests: WorkflowReviewRequestForWorkflowRow[],
	): Promise<Map<string, WorkflowReviewApprovedPublicationState>> {
		const versionIds = [
			...new Set(
				requests.flatMap((request) =>
					request.decision === 'approved' && request.workflowVersionId
						? [request.workflowVersionId]
						: [],
				),
			),
		];
		if (versionIds.length === 0) {
			return new Map();
		}

		return await this.workflowPublishHistoryRepository.getVersionPublicationStates(
			workflowId,
			versionIds,
		);
	}

	private pickApprovedPublicationState(
		request: WorkflowReviewRequestForWorkflowRow,
		states: Map<string, WorkflowReviewApprovedPublicationState>,
	): WorkflowReviewApprovedPublicationState | null {
		if (request.decision !== 'approved') {
			return null;
		}

		// A pruned pin has no version to reason about, so it stays 'unknown'
		if (!request.workflowVersionId) {
			return 'unknown';
		}

		return states.get(request.workflowVersionId) ?? 'unknown';
	}

	async getEligibleReviewers(
		user: User,
		query: GetWorkflowReviewEligibleReviewersQueryDto,
	): Promise<WorkflowReviewEligibleReviewersList> {
		await this.featureGate.assertAvailable();

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
			data: reviewers.map(toEligibleReviewer),
		};
	}

	/**
	 * Called with the review's transaction so a version pruned between the
	 * pre-lock existence check and this write rolls the review write back
	 * instead of leaving an unnamed (still prunable) pin behind.
	 */
	private async nameVersion(
		workflowId: string,
		versionId: string,
		name: string,
		description: string | null | undefined,
		ctx: OperationContext,
	): Promise<void> {
		const affected = await this.workflowHistoryRepository.updateVersionMetadata(
			{ workflowId, versionId, name, description },
			ctx,
		);

		if (affected === 0) {
			throw new BadRequestError(
				`Version '${versionId}' does not exist for workflow '${workflowId}'`,
			);
		}
	}

	async create(
		user: User,
		dto: CreateWorkflowReviewRequestDto,
	): Promise<WorkflowReviewRequestSummary> {
		const { workflowId, workflowVersionId, workflowVersionName, workflowVersionDescription } =
			dto.workflows[0];
		const versionName = workflowVersionName.trim();
		const versionDescription = normalizeVersionDescription(workflowVersionDescription);

		await this.featureGate.assertAvailable();

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

		const request = await this.dbLockService.withLockContext(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (ctx) => {
				const existing = await this.workflowReviewRequestRepository.findOpenRequestForWorkflow(
					workflowId,
					ctx,
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
					ctx,
				);

				await this.workflowReviewRequestWorkflowRepository.createWorkflowRow(
					{
						workflowReviewRequestId: created.id,
						workflowId,
						workflowVersionId,
					},
					ctx,
				);

				// After the conflict check, so a 409 never renames or describes the version.
				await this.nameVersion(workflowId, workflowVersionId, versionName, versionDescription, ctx);

				await this.workflowReviewRequestAuthorRepository.addAuthor(
					{ workflowReviewRequestId: created.id, userId: user.id },
					ctx,
				);

				if (reviewerUserIds.length > 0) {
					await this.workflowReviewRequestReviewerRepository.addReviewers(
						{ workflowReviewRequestId: created.id, userIds: reviewerUserIds },
						ctx,
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
		await this.featureGate.assertAvailable();

		const request = await this.workflowReviewRequestRepository.findById(
			workflowReviewRequestId,
			{},
		);
		if (!request) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
			workflowReviewRequestId,
			{},
		);
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

		const versionName = dto.workflowVersionName.trim();
		const versionDescription = normalizeVersionDescription(dto.workflowVersionDescription);
		const metadataChanged = (current: { name: string | null; description: string | null }) =>
			versionName !== current.name ||
			(versionDescription !== undefined && versionDescription !== current.description);

		// Nothing new to review: skip the lock, write nothing, broadcast nothing.
		if (workflowRow.workflowVersionId === dto.workflowVersionId) {
			// A rename or re-description is the one thing that can still be pending
			// here, and a lone UPDATE is atomic, so apply it rather than silently
			// dropping it.
			if (metadataChanged(version)) {
				// No transaction here: a lone UPDATE is atomic, so the root context is right.
				await this.nameVersion(
					dto.workflowId,
					dto.workflowVersionId,
					versionName,
					versionDescription,
					{},
				);
			}

			return this.toSummary(request, workflowRow.workflowVersionId);
		}

		const { request: updated, changed } = await this.dbLockService.withLockContext(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (ctx) => {
				// Re-check under the lock so update can't race a concurrent close/approve.
				const current = await this.workflowReviewRequestRepository.findById(
					workflowReviewRequestId,
					ctx,
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
					ctx,
				);
				const currentRow = currentRows.find((row) => row.workflowId === dto.workflowId);
				if (!currentRow) {
					throw new NotFoundError('Could not find review request');
				}
				if (currentRow.workflowVersionId === dto.workflowVersionId) {
					// A concurrent sync won the lock and already re-pinned this version
					// but our rename or re-description can still be pending — apply it
					// rather than dropping it, mirroring the pre-lock branch.
					if (metadataChanged(version)) {
						await this.nameVersion(
							dto.workflowId,
							dto.workflowVersionId,
							versionName,
							versionDescription,
							ctx,
						);
					}

					return { request: current, changed: false };
				}

				await this.workflowReviewRequestWorkflowRepository.updateWorkflowVersion(
					{
						workflowReviewRequestId,
						workflowId: dto.workflowId,
						workflowVersionId: dto.workflowVersionId,
					},
					ctx,
				);

				await this.nameVersion(
					dto.workflowId,
					dto.workflowVersionId,
					versionName,
					versionDescription,
					ctx,
				);

				current.decision = 'pending';
				current.updatedById = user.id;
				const saved = await this.workflowReviewRequestRepository.saveRequest(current, ctx);

				await this.workflowReviewRequestAuthorRepository.addAuthorIfMissing(
					{ workflowReviewRequestId, userId: user.id },
					ctx,
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
	 * Decide an open review request: approve (terminal, closes the request and
	 * auto-publishes the pinned version) or request changes (the request stays
	 * open awaiting a new version).
	 */
	async decide(
		user: User,
		workflowReviewRequestId: string,
		dto: DecideWorkflowReviewRequestDto,
	): Promise<DecideWorkflowReviewRequestResponse> {
		await this.featureGate.assertAvailable();

		const request = await this.workflowReviewRequestRepository.findById(
			workflowReviewRequestId,
			{},
		);
		if (!request) {
			throw new NotFoundError('Could not find review request');
		}

		const workflowRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
			workflowReviewRequestId,
			{},
		);
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
		const hasAdminOverride = await this.decisionEligibilityService.hasAdminOverride(
			user,
			request.projectId,
		);

		// Fast path: reject a known author before queueing on the lock.
		const isAuthor = await this.workflowReviewRequestAuthorRepository.isAuthor(
			{ workflowReviewRequestId, userId: user.id },
			{},
		);
		this.assertDecisionAllowed(isAuthor, hasAdminOverride);

		const { request: saved, pinnedVersionId } = await this.dbLockService.withLockContext(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			async (ctx) => {
				// Re-check under the lock so a decision can't race a concurrent
				// version sync (which resets the decision to pending) or another decision.
				const current = await this.workflowReviewRequestRepository.findById(
					workflowReviewRequestId,
					ctx,
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
					ctx,
				);
				this.assertDecisionAllowed(isAuthorNow, hasAdminOverride);

				// Re-read the pinned row too: a concurrent sync that won the lock may
				// have re-pinned, and the summary must reflect the version being decided on.
				const currentRows = await this.workflowReviewRequestWorkflowRepository.findByRequestId(
					workflowReviewRequestId,
					ctx,
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

				const savedRequest = await this.workflowReviewRequestRepository.saveRequest(current, ctx);
				return { request: savedRequest, pinnedVersionId: currentRow.workflowVersionId };
			},
		);

		this.broadcastReviewStateChanged(workflowRow.workflowId);

		const summary = this.toSummary(saved, pinnedVersionId);

		if (dto.decision !== 'approved') {
			return summary;
		}

		return {
			...summary,
			autoPublish: await this.publishApprovedVersion(user, workflowRow.workflowId, pinnedVersionId),
		};
	}

	private async publishApprovedVersion(
		user: User,
		workflowId: string,
		pinnedVersionId: string | null,
	): Promise<WorkflowReviewAutoPublishOutcome> {
		if (pinnedVersionId === null) {
			// Nothing was published and nothing was deactivated, so this stays a
			// warning — unlike a failed activation below. (LIGO-879)
			this.logger.warn('Cannot publish approved review: the pinned version was pruned', {
				workflowId,
			});
			return { status: 'failed', message: 'The reviewed workflow version no longer exists' };
		}

		try {
			await this.workflowService.activateWorkflow(user, workflowId, {
				versionId: pinnedVersionId,
				source: 'review-approval',
			});
		} catch (error) {
			this.logger.error('Failed to publish workflow after review approval', {
				workflowId,
				pinnedVersionId,
				error,
			});
			return { status: 'failed', message: ensureError(error).message };
		}

		// Same broadcast the manual activate endpoint sends, so open editor
		// sessions pick up the newly published version.
		this.collaborationService
			.broadcastWorkflowUpdate(workflowId, user.id)
			.catch((error) =>
				this.logger.warn('Failed to broadcast workflow update', { workflowId, error }),
			);

		return { status: 'published' };
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
}
