import type { DecideWorkflowReviewRequestDto } from '@n8n/api-types';
import type { LicenseState, Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowEntity,
	WorkflowPublishHistoryRepository,
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
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { RoleService } from '@/services/role.service';
import type { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowReviewFeatureGate } from '../workflow-review-feature-gate.service';
import { WorkflowReviewRequestService } from '../workflow-review-request.service';

const memberUser = (id = 'user-1') => mock<User>({ id, role: { slug: 'global:member' } });

const requestId = 'req-1';
const projectId = 'proj-1';
const approveDto: DecideWorkflowReviewRequestDto = { decision: 'approved' };
const requestChangesDto: DecideWorkflowReviewRequestDto = { decision: 'changes_requested' };

describe('WorkflowReviewRequestService.decide', () => {
	const workflowReviewPolicyService = mock<WorkflowReviewPolicyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const publishHistoryRepository = mock<WorkflowPublishHistoryRepository>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const workflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const userRepository = mock<UserRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const roleService = mock<RoleService>();
	const licenseState = mock<LicenseState>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	const workflowService = mock<WorkflowService>();
	const logger = mock<Logger>();
	const tx = mock<EntityManager>();

	const service = new WorkflowReviewRequestService(
		logger,
		new WorkflowReviewFeatureGate(licenseState, workflowReviewPolicyService),
		workflowFinderService,
		workflowHistoryService,
		sharedWorkflowRepository,
		publishHistoryRepository,
		requestRepository,
		workflowRepository,
		authorRepository,
		reviewerRepository,
		userRepository,
		projectRelationRepository,
		roleService,
		dbLockService,
		collaborationService,
		workflowService,
	);

	const openRequest = (overrides: Partial<WorkflowReviewRequest> = {}) =>
		mock<WorkflowReviewRequest>({
			id: requestId,
			projectId,
			state: 'open',
			decision: 'pending',
			closedById: null,
			approvedAt: null,
			createdAt: new Date('2026-07-20T10:00:00.000Z'),
			updatedAt: new Date('2026-07-20T11:00:00.000Z'),
			...overrides,
		});

	const pinnedRow = (workflowVersionId: string | null = 'ver-1') =>
		mock<WorkflowReviewRequestWorkflow>({
			workflowReviewRequestId: requestId,
			workflowId: 'wf-1',
			workflowVersionId,
		});

	const mockSuccessfulDecidePath = () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([pinnedRow()]);
		workflowFinderService.findWorkflowForUser.mockResolvedValue(
			mock<WorkflowEntity>({ isArchived: false }),
		);
		authorRepository.isAuthor.mockResolvedValue(false);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
		tx.save.mockImplementation(async (entity) => entity);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.N8N_ENV_FEAT_WORKFLOW_REVIEWS = 'true';
		licenseState.isWorkflowReviewsLicensed.mockReturnValue(true);
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: true });
		// By default, run the critical section against the mocked transaction.
		dbLockService.withLock.mockImplementation(async (_id, fn) => await fn(tx, {}));
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
		collaborationService.broadcastWorkflowUpdate.mockResolvedValue(undefined);
	});

	it('throws when the instance policy is disabled, before any lookup or lock', async () => {
		workflowReviewPolicyService.get.mockResolvedValue({ enabled: false });

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ForbiddenError,
		);

		expect(requestRepository.findById).not.toHaveBeenCalled();
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the review request does not exist', async () => {
		requestRepository.findById.mockResolvedValue(null);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the request has no linked workflow row', async () => {
		requestRepository.findById.mockResolvedValue(openRequest());
		workflowRepository.findByRequestId.mockResolvedValue([]);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the user lacks publish access to the workflow', async () => {
		mockSuccessfulDecidePath();
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			NotFoundError,
		);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
			'wf-1',
			expect.anything(),
			['workflow:publish'],
		);
		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	it.each([
		['closed', openRequest({ state: 'closed' })],
		['approved', openRequest({ decision: 'approved' })],
	])('throws ConflictError and never takes the lock when the request is %s', async (_name, req) => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(req);

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ConflictError,
		);

		expect(dbLockService.withLock).not.toHaveBeenCalled();
	});

	describe('author eligibility', () => {
		it('throws ForbiddenError for an author without an admin override', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('rejects a caller who became an author while waiting for the lock', async () => {
			mockSuccessfulDecidePath();
			// Not an author before the lock, but a version sync won the lock first and
			// added them to the author set before the critical section runs.
			authorRepository.isAuthor.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			// The re-check must run against the lock's transaction, not a fresh read.
			expect(authorRepository.isAuthor).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ workflowReviewRequestId: requestId }),
				tx,
			);
			expect(tx.save).not.toHaveBeenCalled();
		});

		it.each([['global:admin'], ['global:owner']])(
			'allows an author with the %s role without querying project relations',
			async (slug) => {
				mockSuccessfulDecidePath();
				authorRepository.isAuthor.mockResolvedValue(true);
				const admin = mock<User>({ id: 'user-1', role: { slug } });

				const result = await service.decide(admin, requestId, approveDto);

				expect(result.decision).toBe('approved');
				expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
			},
		);

		it('allows an author who is a project admin of the review project', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(result.decision).toBe('approved');
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith(
				'user-1',
				['project:admin'],
			);
		});

		it('throws ForbiddenError for an author who is only a project admin elsewhere', async () => {
			mockSuccessfulDecidePath();
			authorRepository.isAuthor.mockResolvedValue(true);
			projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue(['other-proj']);

			await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
				ForbiddenError,
			);

			expect(dbLockService.withLock).not.toHaveBeenCalled();
		});

		it('resolves the admin override once, before taking the lock', async () => {
			mockSuccessfulDecidePath();

			await service.decide(memberUser(), requestId, approveDto);

			// The override query must never run inside the lock transaction: with a
			// single-connection pool it would deadlock waiting for a second connection.
			const [overrideOrder] =
				projectRelationRepository.getAccessibleProjectsByRoles.mock.invocationCallOrder;
			const [lockOrder] = dbLockService.withLock.mock.invocationCallOrder;
			expect(overrideOrder).toBeLessThan(lockOrder);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		});
	});

	it('approves: closes the request, stamps closedById and approvedAt, and broadcasts', async () => {
		mockSuccessfulDecidePath();

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(dbLockService.withLock).toHaveBeenCalledWith(
			DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
			expect.any(Function),
		);
		// Re-checked under the lock through the transaction manager.
		expect(requestRepository.findById).toHaveBeenCalledWith(requestId, tx);
		const savedEntity = tx.save.mock.calls[0]?.[0] as unknown as WorkflowReviewRequest;
		expect(savedEntity).toMatchObject({
			decision: 'approved',
			state: 'closed',
			updatedById: 'user-1',
			closedById: 'user-1',
			approvedAt: expect.any(Date),
		});
		expect(result).toEqual({
			id: requestId,
			state: 'closed',
			decision: 'approved',
			workflowVersionId: 'ver-1',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T11:00:00.000Z',
			autoPublish: { status: 'published' },
		});
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
	});

	it('requests changes: keeps the request open and leaves closedById/approvedAt untouched', async () => {
		mockSuccessfulDecidePath();

		const result = await service.decide(memberUser(), requestId, requestChangesDto);

		const savedEntity = tx.save.mock.calls[0]?.[0] as unknown as WorkflowReviewRequest;
		expect(savedEntity).toMatchObject({
			decision: 'changes_requested',
			state: 'open',
			updatedById: 'user-1',
			closedById: null,
			approvedAt: null,
		});
		expect(result.state).toBe('open');
		expect(result.decision).toBe('changes_requested');
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
	});

	it('allows repeating changes_requested (e.g. a second reviewer)', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser('user-2'), requestId, requestChangesDto);

		expect(result.decision).toBe('changes_requested');
		const savedEntity = tx.save.mock.calls[0]?.[0] as unknown as WorkflowReviewRequest;
		expect(savedEntity).toMatchObject({ updatedById: 'user-2' });
	});

	it('allows approving a changes_requested review', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById.mockResolvedValue(openRequest({ decision: 'changes_requested' }));

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(result.decision).toBe('approved');
		expect(result.state).toBe('closed');
	});

	it('throws ConflictError and saves/broadcasts nothing when the request closes between check and lock', async () => {
		mockSuccessfulDecidePath();
		requestRepository.findById
			.mockResolvedValueOnce(openRequest())
			.mockResolvedValueOnce(openRequest({ state: 'closed', decision: 'approved' }));

		await expect(service.decide(memberUser(), requestId, approveDto)).rejects.toThrow(
			ConflictError,
		);

		expect(tx.save).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
	});

	it('reports and publishes the version re-pinned by a concurrent sync that won the lock', async () => {
		mockSuccessfulDecidePath();
		workflowRepository.findByRequestId
			.mockResolvedValueOnce([pinnedRow('ver-1')])
			// In-lock re-read: a concurrent update-version re-pinned first.
			.mockResolvedValueOnce([pinnedRow('ver-2')]);

		const result = await service.decide(memberUser(), requestId, approveDto);

		expect(workflowRepository.findByRequestId).toHaveBeenLastCalledWith(requestId, tx);
		expect(result.workflowVersionId).toBe('ver-2');
		// The published version must be the one the approval was recorded against.
		expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			'wf-1',
			{ versionId: 'ver-2', source: 'review-approval' },
		);
	});

	describe('auto-publish on approval', () => {
		it('publishes the pinned version as the reviewer, after the approval commits', async () => {
			mockSuccessfulDecidePath();

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(workflowService.activateWorkflow).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: 'user-1' }),
				'wf-1',
				{ versionId: 'ver-1', source: 'review-approval' },
			);
			// The approval must commit before publishing: the closed review is what
			// lets the publish gate pass without a bypass.
			const [lockOrder] = dbLockService.withLock.mock.invocationCallOrder;
			const [publishOrder] = workflowService.activateWorkflow.mock.invocationCallOrder;
			expect(lockOrder).toBeLessThan(publishOrder);
			expect(result.autoPublish).toEqual({ status: 'published' });
		});

		it('broadcasts a workflow update to open editor sessions after publishing', async () => {
			mockSuccessfulDecidePath();

			await service.decide(memberUser(), requestId, approveDto);

			expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith('wf-1', 'user-1');
		});

		it('never publishes on changes_requested and omits the outcome', async () => {
			mockSuccessfulDecidePath();

			const result = await service.decide(memberUser(), requestId, requestChangesDto);

			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result).not.toHaveProperty('autoPublish');
		});

		it('keeps the approval and reports the failure when publishing rejects', async () => {
			mockSuccessfulDecidePath();
			workflowService.activateWorkflow.mockRejectedValue(new Error('webhook path conflict'));

			const result = await service.decide(memberUser(), requestId, approveDto);

			// The approval is committed and never reverted by a publish failure.
			expect(tx.save.mock.calls[0]?.[0]).toMatchObject({ decision: 'approved', state: 'closed' });
			expect(result).toMatchObject({
				state: 'closed',
				decision: 'approved',
				autoPublish: { status: 'failed', message: 'webhook path conflict' },
			});
			// Logged at error, not warn: the failure can leave a previously published
			// workflow deactivated.
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to publish workflow after review approval',
				expect.objectContaining({ workflowId: 'wf-1', pinnedVersionId: 'ver-1' }),
			);
			expect(collaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
		});

		it('skips publishing and reports a failure when the pinned version was pruned', async () => {
			mockSuccessfulDecidePath();
			workflowRepository.findByRequestId.mockResolvedValue([pinnedRow(null)]);

			const result = await service.decide(memberUser(), requestId, approveDto);

			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(result.autoPublish).toEqual({
				status: 'failed',
				message: 'The reviewed workflow version no longer exists',
			});
		});
	});

	it('resolves and logs a warning when the broadcast rejects', async () => {
		mockSuccessfulDecidePath();
		collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
			new Error('push down'),
		);

		const result = await service.decide(memberUser(), requestId, approveDto);
		expect(result.id).toBe(requestId);

		// Let the fire-and-forget rejection handler run.
		await new Promise(process.nextTick);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to broadcast review state change',
			expect.objectContaining({ workflowId: 'wf-1' }),
		);
	});
});
