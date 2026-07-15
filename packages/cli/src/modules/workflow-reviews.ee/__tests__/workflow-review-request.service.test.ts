import type { CreateWorkflowReviewRequestDto } from '@n8n/api-types';
import type {
	DbLockService,
	Project,
	SharedWorkflowRepository,
	User,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { DbLock } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewRequestService } from '../workflow-review-request.service';

const user = mock<User>({ id: 'user-1' });

const dto: CreateWorkflowReviewRequestDto = {
	title: 'Please review',
	description: 'A description',
	workflows: [{ workflowId: 'wf-1', workflowVersionId: 'ver-1' }],
};

describe('WorkflowReviewRequestService', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const dbLockService = mock<DbLockService>();
	const tx = mock<EntityManager>();

	const service = new WorkflowReviewRequestService(
		workflowReviewPolicyService,
		workflowFinderService,
		workflowHistoryService,
		sharedWorkflowRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		dbLockService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		// Feature enabled by default; the disabled path is exercised explicitly.
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// By default, run the critical section against the mocked transaction.
		dbLockService.withLock.mockImplementation(async (_id, fn) => await fn(tx));
	});

	describe('create', () => {
		it('throws when the instance policy is disabled, before any lookup or lock', async () => {
			workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

			await expect(service.create(user, dto)).rejects.toThrow(ForbiddenError);

			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('creates parent, child and author rows inside the lock transaction', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(null);
			requestRepository.createRequest.mockResolvedValue(
				mock<WorkflowReviewRequest>({ id: 'req-1' }),
			);

			const result = await service.create(user, dto);

			expect(result.id).toBe('req-1');
			expect(dbLockService.withLock).toHaveBeenCalledWith(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				expect.any(Function),
			);
			expect(requestRepository.createRequest).toHaveBeenCalledWith(
				{
					projectId: 'project-1',
					title: 'Please review',
					description: 'A description',
					createdById: 'user-1',
				},
				tx,
			);
			expect(workflowRepository.createWorkflowRow).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', workflowId: 'wf-1', workflowVersionId: 'ver-1' },
				tx,
			);
			expect(authorRepository.addAuthor).toHaveBeenCalledWith(
				{ workflowReviewRequestId: 'req-1', userId: 'user-1' },
				tx,
			);
		});

		it('throws NotFoundError and never takes the lock when the finder returns null', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:publish',
			]);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock for an archived workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: true }),
			);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws BadRequestError and never takes the lock when the version does not exist', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			await expect(service.create(user, dto)).rejects.toThrow(BadRequestError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the workflow has no owning project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

			await expect(service.create(user, dto)).rejects.toThrow(NotFoundError);
			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('throws ConflictError carrying the existing id and writes nothing when an open review exists', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				mock<WorkflowEntity>({ isArchived: false }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(mock());
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(
				mock<Project>({ id: 'project-1' }),
			);
			requestRepository.findOpenRequestForWorkflow.mockResolvedValue(
				mock<WorkflowReviewRequest>({ id: 'existing-1' }),
			);

			const error = await service.create(user, dto).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(ConflictError);
			expect((error as ConflictError).meta).toEqual({ workflowReviewRequestId: 'existing-1' });

			expect(requestRepository.createRequest).not.toHaveBeenCalled();
			expect(workflowRepository.createWorkflowRow).not.toHaveBeenCalled();
			expect(authorRepository.addAuthor).not.toHaveBeenCalled();
		});
	});
});
