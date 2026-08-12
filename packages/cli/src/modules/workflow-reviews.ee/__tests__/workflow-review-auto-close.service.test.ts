import type { Logger } from '@n8n/backend-common';
import type {
	DbLockService,
	OperationContext,
	Transaction,
	WorkflowReviewRequest,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';

import { WorkflowReviewAutoCloseService } from '../workflow-review-auto-close.service';

describe('WorkflowReviewAutoCloseService', () => {
	const logger = mock<Logger>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	/** The lock's context. Distinct from the root `{}` so tests can tell the two apart. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	const service = new WorkflowReviewAutoCloseService(
		logger,
		requestRepository,
		dbLockService,
		collaborationService,
	);

	const openRequest = (overrides: Partial<WorkflowReviewRequest> = {}) =>
		mock<WorkflowReviewRequest>({
			id: 'req-1',
			state: 'open',
			decision: 'pending',
			closedById: null,
			...overrides,
		});

	beforeEach(() => {
		vi.resetAllMocks();
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		requestRepository.saveRequest.mockImplementation(async (request) => request);
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	it('closes an open request on archive, leaving the decision and audit fields intact', async () => {
		const request = openRequest({ decision: 'changes_requested', updatedById: 'user-2' });
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request, workflowIds: ['wf-1'] },
		]);

		await service.afterWorkflowArchived('wf-1');

		expect(requestRepository.findOpenRequestsForWorkflows).toHaveBeenCalledWith(['wf-1'], ctx);
		expect(requestRepository.saveRequest).toHaveBeenCalledExactlyOnceWith(request, ctx);
		expect(request.state).toBe('closed');
		expect(request.decision).toBe('changes_requested');
		expect(request.closedById).toBeNull();
		expect(request.updatedById).toBe('user-2');
		expect(
			collaborationService.broadcastWorkflowReviewStateChanged,
		).toHaveBeenCalledExactlyOnceWith('wf-1');
	});

	it('closes each open request on transfer and broadcasts once per affected workflow', async () => {
		const first = openRequest({ id: 'req-1' });
		const second = openRequest({ id: 'req-2' });
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request: first, workflowIds: ['wf-1'] },
			{ request: second, workflowIds: ['wf-2'] },
		]);

		await service.afterWorkflowsTransferred(['wf-1', 'wf-2', 'wf-3']);

		expect(requestRepository.findOpenRequestsForWorkflows).toHaveBeenCalledWith(
			['wf-1', 'wf-2', 'wf-3'],
			ctx,
		);
		expect(first.state).toBe('closed');
		expect(second.state).toBe('closed');
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(2);
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-2');
	});

	it('closes an open request before its workflow is deleted', async () => {
		const request = openRequest();
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request, workflowIds: ['wf-1'] },
		]);

		await service.beforeWorkflowDeleted('wf-1');

		expect(request.state).toBe('closed');
	});

	it('does nothing when no open request is linked — no save, no broadcast', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

		await service.afterWorkflowArchived('wf-1');

		expect(requestRepository.saveRequest).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('swallows and logs repository errors instead of failing the workflow mutation', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

		await expect(service.afterWorkflowArchived('wf-1')).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
	});

	it('swallows repository errors on transfer too — the move already committed', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

		await expect(service.afterWorkflowsTransferred(['wf-1'])).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalled();
	});

	// The pre-delete hook must not swallow: the link rows would cascade away and strand the
	// still-open request.
	it('rethrows repository errors before a delete, so the delete is called off', async () => {
		const error = new Error('db down');
		requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(error);

		await expect(service.beforeWorkflowDeleted('wf-1')).rejects.toThrow(error);

		expect(logger.error).toHaveBeenCalled();
	});

	describe('afterWorkflowsDeleted', () => {
		it('closes the requests the delete orphaned, outside any lock', async () => {
			requestRepository.closeOrphanedOpenRequests.mockResolvedValue(['req-9']);

			await service.afterWorkflowsDeleted(['wf-1', 'wf-2']);

			// A single atomic statement pair, so it needs no lock — and must not take one
			// after a delete, where camping on the create lock would serialize submissions.
			// The sweep is global, so the batch never reaches the query; it is log context only.
			expect(requestRepository.closeOrphanedOpenRequests).toHaveBeenCalledExactlyOnceWith({});
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				expect.objectContaining({
					reason: 'workflow-deleted',
					workflowIds: ['wf-1', 'wf-2'],
					workflowReviewRequestIds: ['req-9'],
				}),
			);
		});

		it('stays quiet when the delete orphaned nothing', async () => {
			requestRepository.closeOrphanedOpenRequests.mockResolvedValue([]);

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(logger.info).not.toHaveBeenCalled();
		});

		// The delete already committed, so there is nothing left to abort.
		it('swallows repository errors, unlike the pre-delete hook', async () => {
			requestRepository.closeOrphanedOpenRequests.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsDeleted(['wf-1', 'wf-2'])).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				expect.objectContaining({ workflowIds: ['wf-1', 'wf-2'] }),
			);
		});
	});

	it('a failed broadcast is only warned about, never thrown', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request: openRequest(), workflowIds: ['wf-1'] },
		]);
		collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
			new Error('push down'),
		);

		await expect(service.afterWorkflowArchived('wf-1')).resolves.toBeUndefined();

		// Let the fire-and-forget rejection settle before asserting.
		await new Promise(process.nextTick);
		expect(logger.warn).toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
	});
});
