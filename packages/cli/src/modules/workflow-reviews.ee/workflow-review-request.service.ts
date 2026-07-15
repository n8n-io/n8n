import type { CreateWorkflowReviewRequestDto } from '@n8n/api-types';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
	type User,
	type WorkflowReviewRequest,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

@Service()
export class WorkflowReviewRequestService {
	constructor(
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowReviewRequestRepository: WorkflowReviewRequestRepository,
		private readonly workflowReviewRequestWorkflowRepository: WorkflowReviewRequestWorkflowRepository,
		private readonly workflowReviewRequestAuthorRepository: WorkflowReviewRequestAuthorRepository,
		private readonly dbLockService: DbLockService,
	) {}

	async create(user: User, dto: CreateWorkflowReviewRequestDto): Promise<WorkflowReviewRequest> {
		const { workflowId, workflowVersionId } = dto.workflows[0];

		/**
		 * 1. The admin policy toggle is the instance-level master switch: while
		 * disabled, workflow reviews are unavailable, so reject before any work.
		 */
		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled for this instance');
		}

		/**
		 * 2. Authorization + existence in one query. We require `workflow:publish`. Anyone
		 * without it (viewer, build-only role, non-member) gets null, which we
		 * surface as "not found" so we don't leak existence.
		 */
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:publish',
		]);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		/** 3. Archived workflows cannot be submitted for review. */
		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${workflowId}' is archived and cannot be submitted for review`,
			);
		}

		/**
		 * 4. The pinned version must exist for this workflow. versionId alone is a
		 * global PK, so both ids must be checked together.
		 */
		const version = await this.workflowHistoryService.findVersion(workflowId, workflowVersionId);
		if (!version) {
			throw new BadRequestError(
				`Version '${workflowVersionId}' does not exist for workflow '${workflowId}'`,
			);
		}

		/** 5. Resolve the owning project — the review request belongs to it. */
		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		/**
		 * 6. Serialize creation so "at most one open review per workflow" holds
		 * under concurrency: the conflict check and all three inserts run in one
		 * transaction; any throw rolls everything back and releases the lock.
		 */
		return await this.dbLockService.withLock(DbLock.WORKFLOW_REVIEW_REQUEST_CREATE, async (tx) => {
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

			const request = await this.workflowReviewRequestRepository.createRequest(
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
					workflowReviewRequestId: request.id,
					workflowId,
					workflowVersionId,
				},
				tx,
			);

			await this.workflowReviewRequestAuthorRepository.addAuthor(
				{ workflowReviewRequestId: request.id, userId: user.id },
				tx,
			);

			return request;
		});
	}
}
