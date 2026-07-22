import type {
	CreateWorkflowReviewRequestDto,
	GetWorkflowReviewEligibleReviewersQueryDto,
	ListWorkflowReviewRequestsQueryDto,
	WorkflowReviewEligibleReviewersList,
	WorkflowReviewRequestList,
	WorkflowReviewRequestSummary,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DbLock,
	DbLockService,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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

				if (reviewerUserIds.length > 0) {
					await this.workflowReviewRequestReviewerRepository.addReviewers(
						{ workflowReviewRequestId: created.id, userIds: reviewerUserIds },
						tx,
					);
				}

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
}
