import type {
	CreateWorkflowReviewRequestDto,
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
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxCursor,
	type User,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestLinkedWorkflow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

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
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly workflowReviewRequestReviewerRepository: WorkflowReviewRequestReviewerRepository,
		private readonly userRepository: UserRepository,
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
			data: reviewers.map((reviewer) => ({
				id: reviewer.id,
				email: reviewer.email,
				firstName: reviewer.firstName ?? null,
				lastName: reviewer.lastName ?? null,
			})),
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

	/** A closed or already-approved request can no longer be re-pinned to a new version. */
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
		const linkedWorkflowByRequestId =
			await this.workflowReviewRequestWorkflowRepository.findLinkedWorkflowsByRequestIds(
				data.map((row) => row.id),
			);

		return {
			data: data.map((row) => this.toInboxItem(row, linkedWorkflowByRequestId.get(row.id) ?? null)),
			nextCursor,
			hasMore,
		};
	}

	async getInboxSummaryForUser(user: User): Promise<GetWorkflowReviewInboxSummaryResponse> {
		await this.assertFeatureAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		return await this.workflowReviewRequestRepository.countByStateForInbox({
			projectIds,
			requesterId: user.id,
		});
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
		};
	}
}
