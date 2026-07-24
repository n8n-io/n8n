import type { UpdateWorkflowReviewRequestVersionDto } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestRepository,
	WorkflowReviewRequestReviewerRepository,
	WorkflowReviewRequestWorkflow,
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { DbLock } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { WorkflowReviewRequestService } from '../workflow-review-request.service';

const user = mock<User>({ id: 'user-1' });

const requestId = 'req-1';
const dto: UpdateWorkflowReviewRequestVersionDto = {
	workflowId: 'wf-1',
	workflowVersionId: 'ver-2',
};

describe('WorkflowReviewRequestService.updateVersion', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const projectService = mock<ProjectService>();
	const licenseState = mock<LicenseState>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	const logger = mock<Logger>();
	const tx = mock<EntityManager>();

	const service = new WorkflowReviewRequestService(
		logger,
		workflowReviewPolicyService,
		workflowFinderService,
		workflowHistoryService,
		sharedWorkflowRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		userRepository,
		roleService,
		projectService,
		licenseState,
		dbLockService,
		collaborationService,
	);

	const openRequest = (overrides: Partial<WorkflowReviewRequest> = {}) =>
		mock<WorkflowReviewRequest>({
			id: requestId,
			state: 'open',
			decision: 'pending',
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
			updatedAt: new Date('2026-07-20T11:00:00.000Z'),
			...overrides,
		});

	const mockSuccessfulUpdatePath = () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({
				workflowReviewRequestId: requestId,
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			}),
		]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: false }),
		);
		workflowHistoryService.findVersion.mockResolvedValue(mock());
		tx.save.mockImplementation(async (entity) => entity);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// By default, run the critical section against the mocked transaction.
		dbLockService.withLock.mockImplementation(async (_id, fn) => await fn(tx));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	it('throws when the instance policy is disabled, before any lookup or lock', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ForbiddenError);

		expect(requestRepository.findById).not.toHaveBeenCalled();
		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the review request does not exist', async () => {
		requestRepository.findById.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request does not cover the given workflow', async () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({ workflowId: 'other-wf' }),
		]);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the user lacks publish access to the workflow', async () => {
		mockSuccessfulUpdatePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:publish',
		]);
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws BadRequestError and never takes the lock for an archived workflow', async () => {
		mockSuccessfulUpdatePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: true }),
		);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(BadRequestError);

		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it.each([
		['closed', openRequest({ state: 'closed' })],
		['approved', openRequest({ decision: 'approved' })],
	])('throws ConflictError and never takes the lock when the request is %s', async (_name, req) => {
		mockSuccessfulUpdatePath();
		requestRepository.findById.mockResolvedValue(req);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws BadRequestError and never takes the lock when the version does not exist', async () => {
		mockSuccessfulUpdatePath();
		workflowHistoryService.findVersion.mockResolvedValue(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(BadRequestError);

		expect(workflowHistoryService.findVersion).toHaveBeenCalledWith('wf-1', 'ver-2');
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('returns the current summary without lock, writes, or broadcast when the version is unchanged', async () => {
		mockSuccessfulUpdatePath();
		workflowRepository.findByRequestId.mockResolvedValue([
			mock<WorkflowReviewRequestWorkflow>({
				workflowReviewRequestId: requestId,
				workflowId: 'wf-1',
				workflowVersionId: 'ver-2',
			}),
		]);

		const result = await service.updateVersion(user, requestId, dto);

		expect(result).toEqual({
			id: requestId,
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'ver-2',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
		});
		expect(dbLockService.withLock).not.toHaveBeenCalled();
		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
	});

	it('re-pins the version, resets the decision, and appends the author in one transaction', async () => {
		mockSuccessfulUpdatePath();

		const result = await service.updateVersion(user, requestId, dto);

		expect(dbLockService.withLock).toHaveBeenCalledWith(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			expect.any(Function),
		);
		// Re-checked under the lock through the transaction manager.
		expect(requestRepository.findById).toHaveBeenCalledWith(requestId, tx);
		expect(workflowRepository.updateWorkflowVersion).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, workflowId: 'wf-1', workflowVersionId: 'ver-2' },
			tx,
		);
		const savedEntity = tx.save.mock.calls[0]?.[0] as unknown as WorkflowReviewRequest;
		expect(savedEntity).toMatchObject({ decision: 'pending', updatedById: 'user-1' });
		expect(authorRepository.addAuthorIfMissing).toHaveBeenCalledWith(
			{ workflowReviewRequestId: requestId, userId: 'user-1' },
			tx,
		);
		expect(result).toEqual({
			id: requestId,
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'ver-2',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
		});
	});

	it('throws ConflictError and writes nothing when the request closes between check and lock', async () => {
		mockSuccessfulUpdatePath();
		requestRepository.findById
			.mockResolvedValueOnce(openRequest())
			.mockResolvedValueOnce(openRequest({ state: 'closed' }));

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(tx.save).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
	});

	it('writes and broadcasts nothing when a concurrent identical sync wins the lock first', async () => {
		mockSuccessfulUpdatePath();
		workflowRepository.findByRequestId
			.mockResolvedValueOnce([
				mock<WorkflowReviewRequestWorkflow>({
					workflowReviewRequestId: requestId,
					workflowId: 'wf-1',
					workflowVersionId: 'ver-1',
				}),
			])
			// In-lock re-read: the winner already re-pinned to the requested version.
			.mockResolvedValueOnce([
				mock<WorkflowReviewRequestWorkflow>({
					workflowReviewRequestId: requestId,
					workflowId: 'wf-1',
					workflowVersionId: 'ver-2',
				}),
			]);

		const result = await service.updateVersion(user, requestId, dto);

		expect(workflowRepository.findByRequestId).toHaveBeenLastCalledWith(requestId, tx);
		expect(result.workflowVersionId).toBe('ver-2');
		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
		expect(tx.save).not.toHaveBeenCalled();
		expect(authorRepository.addAuthorIfMissing).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request disappears between check and lock', async () => {
		mockSuccessfulUpdatePath();
		requestRepository.findById.mockResolvedValueOnce(openRequest()).mockResolvedValueOnce(null);

		await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(NotFoundError);

		expect(workflowRepository.updateWorkflowVersion).not.toHaveBeenCalled();
	});

	describe('review state broadcast', () => {
		it('broadcasts exactly once after the lock resolves', async () => {
			mockSuccessfulUpdatePath();
			let lockResolved = false;
			dbLockService.withLock.mockImplementation(async (_id, fn) => {
				const result = await fn(tx);
				lockResolved = true;
				return result;
			});
			collaborationService.broadcastWorkflowReviewStateChanged.mockImplementation(async () => {
				expect(lockResolved).toBe(true);
			});

			await service.updateVersion(user, requestId, dto);

			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(1);
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		});

		it('does not broadcast on an in-transaction conflict', async () => {
			mockSuccessfulUpdatePath();
			requestRepository.findById
				.mockResolvedValueOnce(openRequest())
				.mockResolvedValueOnce(openRequest({ state: 'closed' }));

			await expect(service.updateVersion(user, requestId, dto)).rejects.toThrow(ConflictError);

			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		});

		it('resolves and logs a warning when the broadcast rejects', async () => {
			mockSuccessfulUpdatePath();
			collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
				new Error('push down'),
			);

			const result = await service.updateVersion(user, requestId, dto);
			expect(result.id).toBe(requestId);

			// Let the fire-and-forget rejection handler run.
			await new Promise(process.nextTick);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to broadcast review state change',
				expect.objectContaining({ workflowId: 'wf-1' }),
			);
		});
	});
});
