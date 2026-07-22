import type {
	CreateWorkflowReviewRequestDto,
	ListWorkflowReviewRequestsQueryDto,
	WorkflowReviewRequestList,
	WorkflowReviewRequestSummary,
	ListWorkflowReviewInboxQueryDto,
	ListWorkflowReviewInboxResponse,
	GetWorkflowReviewInboxSummaryResponse,
	WorkflowReviewInboxItemDto,
} from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
	type InboxCursor,
	type User,
	type WorkflowReviewRequest,
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
		private readonly projectService: ProjectService,
		private readonly licenseState: LicenseState,
		private readonly dbLockService: DbLockService,
		private readonly collaborationService: CollaborationService,
	) {}

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
				createdAt: request.createdAt.toISOString(),
				updatedAt: request.updatedAt.toISOString(),
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
						'Sync the existing review request instead of creating a new one',
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

				return created;
			},
		);

		// Fire-and-forget: the transaction has committed, a failed broadcast
		// must not fail the request. Viewers heal via focus/reconnect refetch.
		this.collaborationService
			.broadcastWorkflowReviewStateChanged(workflowId)
			.catch((error) =>
				this.logger.warn('Failed to broadcast review state change', { workflowId, error }),
			);

		return {
			id: request.id,
			state: request.state,
			decision: request.decision,
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
		const workflowNamesByRequestId =
			await this.workflowReviewRequestWorkflowRepository.findWorkflowNamesByRequestIds(
				data.map((row) => row.id),
			);

		return {
			data: data.map((row) =>
				this.toInboxItemDto(row, workflowNamesByRequestId.get(row.id) ?? null),
			),
			nextCursor,
			hasMore,
		};
	}

	async getInboxSummaryForUser(user: User): Promise<GetWorkflowReviewInboxSummaryResponse> {
		await this.assertFeatureAvailable();

		const projectIds = await this.resolveAccessibleProjectIds(user);
		// Any state — sidebar must appear so users can open the Closed tab.
		const hasAny = await this.workflowReviewRequestRepository.existsAnyForInbox({
			projectIds,
			requesterId: user.id,
		});

		return { hasAny };
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
	 * Project IDs for inbox queries. `null` means "all projects, unfiltered".
	 *
	 * Global-scope users (instance owners/admins) would resolve to every project id,
	 * which both enumerates the whole table and can blow SQLite's bound-parameter cap
	 * on the `projectId IN (...)` filter. For them we skip the filter entirely.
	 *
	 * For everyone else `getProjectIdsWithScope` only returns team projects, so the
	 * caller's personal project is added explicitly — members can create reviews there.
	 */
	async resolveAccessibleProjectIds(user: User): Promise<string[] | null> {
		if (hasGlobalScope(user, 'project:delete') || hasGlobalScope(user, 'workflow:publish')) {
			return null;
		}

		const [adminProjectIds, publishProjectIds, personalProject] = await Promise.all([
			this.projectService.getProjectIdsWithScope(user, ['project:delete']),
			this.projectService.getProjectIdsWithScope(user, ['workflow:publish']),
			this.projectService.getPersonalProject(user),
		]);

		const projectIds = new Set([...adminProjectIds, ...publishProjectIds]);
		if (personalProject) {
			projectIds.add(personalProject.id);
		}

		return [...projectIds];
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

	private toInboxItemDto(
		entity: WorkflowReviewRequest,
		workflowName: string | null,
	): WorkflowReviewInboxItemDto {
		return {
			id: entity.id,
			projectId: entity.projectId,
			title: entity.title,
			workflowName,
			decision: entity.decision,
			state: entity.state,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
		};
	}
}
