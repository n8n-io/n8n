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
