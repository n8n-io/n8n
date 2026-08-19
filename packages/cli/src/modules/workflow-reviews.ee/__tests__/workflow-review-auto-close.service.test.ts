import type { Logger } from '@n8n/backend-common';
import { DbLock } from '@n8n/db';
import type {
	DbLockService,
	OperationContext,
	Transaction,
	WorkflowReviewActivity,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';

import { WorkflowReviewAutoCloseService } from '../workflow-review-auto-close.service';

describe('WorkflowReviewAutoCloseService', () => {
	const logger = mock<Logger>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const activityRepository = mock<WorkflowReviewActivityRepository>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	/** The lock's context. Distinct from the root `{}` so tests can tell the two apart. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	const service = new WorkflowReviewAutoCloseService(
		logger,
		requestRepository,
		activityRepository,
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
		requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([]);
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	it('closes an open request on archive, leaving the decision and audit fields intact', async () => {
		const request = openRequest({ decision: 'changes_requested', updatedById: 'user-2' });
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
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
			{ request: first, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			{ request: second, links: [{ workflowId: 'wf-2', workflowVersionId: 'wfv-2' }] },
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
			{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
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

	describe('reconciliation sweep', () => {
		it('closes the requests the delete orphaned and explains each of them', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([
				{ id: 'req-9', reason: 'workflow-deleted' },
			]);
			activityRepository.createActivity.mockResolvedValue(mock<WorkflowReviewActivity>());

			await service.afterWorkflowsDeleted(['wf-1', 'wf-2']);

			// Same lock and same transaction as every other close path: the sweep updates the
			// requests it selected by id, so two racing sweeps would otherwise explain the same
			// close twice. The sweep is global, so the batch never reaches the query; it is log
			// context only.
			expect(dbLockService.withLockContext).toHaveBeenCalledWith(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				expect.any(Function),
			);
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);
			expect(activityRepository.createActivity).toHaveBeenCalledExactlyOnceWith(
				{
					workflowReviewRequestId: 'req-9',
					type: 'review.closed',
					data: { reason: 'workflow-deleted' },
					createdById: null,
				},
				ctx,
			);
			expect(logger.info).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				expect.objectContaining({
					workflowIds: ['wf-1', 'wf-2'],
					closedRequests: [{ id: 'req-9', reason: 'workflow-deleted' }],
				}),
			);
		});

		// The reason is per request, not per mutation: one sweep can find a review left by an
		// archive next to one left by a move.
		it('explains each request with the reason the sweep reported for it', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([
				{ id: 'req-1', reason: 'workflow-archived' },
				{ id: 'req-2', reason: 'workflow-moved' },
			]);
			activityRepository.createActivity.mockResolvedValue(mock<WorkflowReviewActivity>());

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowReviewRequestId: 'req-1',
					data: { reason: 'workflow-archived' },
				}),
				ctx,
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowReviewRequestId: 'req-2',
					data: { reason: 'workflow-moved' },
				}),
				ctx,
			);
		});

		it('stays quiet when nothing is left unreviewable', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([]);

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(logger.info).not.toHaveBeenCalled();
		});

		// The close and its explanation share one transaction, so an unwritable entry rolls the
		// close back and the next sweep picks the review up again. The delete already committed,
		// so there is nothing left to fail.
		it('leaves a review it cannot explain to the next sweep', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([
				{ id: 'req-9', reason: 'workflow-deleted' },
			]);
			activityRepository.createActivity.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsDeleted(['wf-1'])).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
		});

		// The delete already committed, so there is nothing left to abort.
		it('swallows repository errors, unlike the pre-delete hook', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsDeleted(['wf-1', 'wf-2'])).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				expect.objectContaining({ workflowIds: ['wf-1', 'wf-2'] }),
			);
		});

		// An archive or a move whose close rolled back stays committed, so the sweep has to run
		// there too — the targeted close is done with the review by then.
		it('runs after the targeted close on archive, and again on transfer', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

			await service.afterWorkflowArchived('wf-1');
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);

			await service.afterWorkflowsTransferred(['wf-2']);
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledTimes(2);
		});

		// A close that rolled back is exactly what the sweep is there to repair, so a throwing
		// targeted close must not skip it.
		it('still runs when the targeted close on archive failed', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowArchived('wf-1')).resolves.toBeUndefined();

			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);
		});

		// The pre-delete hook aborts the delete instead, so there is nothing to reconcile.
		it('does not run before a delete', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

			await service.beforeWorkflowDeleted('wf-1');

			expect(requestRepository.closeUnreviewableOpenRequests).not.toHaveBeenCalled();
		});
	});

	it('a failed broadcast is only warned about, never thrown', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{ request: openRequest(), links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
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
