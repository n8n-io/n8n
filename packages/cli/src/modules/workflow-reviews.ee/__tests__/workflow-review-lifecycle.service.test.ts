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
	WorkflowReviewRequestWorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';

import { WorkflowReviewLifecycleService } from '../workflow-review-lifecycle.service';

describe('WorkflowReviewLifecycleService', () => {
	const logger = mock<Logger>();
	const requestRepository = mock<WorkflowReviewRequestRepository>();
	const requestWorkflowRepository = mock<WorkflowReviewRequestWorkflowRepository>();
	const activityRepository = mock<WorkflowReviewActivityRepository>();
	const dbLockService = mock<DbLockService>();
	const collaborationService = mock<CollaborationService>();
	/** The lock's context. Distinct from the root `{}` so tests can tell the two apart. */
	const ctx: OperationContext = { trx: mock<Transaction>() };

	let service: WorkflowReviewLifecycleService;

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
		// Captures live on the instance; a fresh service isolates the delete tests.
		service = new WorkflowReviewLifecycleService(
			logger,
			requestRepository,
			requestWorkflowRepository,
			activityRepository,
			dbLockService,
			collaborationService,
		);
		dbLockService.withLockContext.mockImplementation(async (_id, fn) => await fn(ctx));
		requestRepository.saveRequest.mockImplementation(async (request) => request);
		requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([]);
		// Single-workflow default: nothing reviewable remains, so the policy closes.
		requestRepository.hasReviewableWorkflowOutside.mockResolvedValue(false);
		activityRepository.createActivity.mockResolvedValue(mock<WorkflowReviewActivity>());
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	describe('archive', () => {
		it('records the cause entry and the close entry together, in the lock transaction', async () => {
			const request = openRequest({ decision: 'changes_requested', updatedById: 'user-2' });
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			]);

			await service.afterWorkflowArchived('wf-1', 'user-9');

			expect(dbLockService.withLockContext).toHaveBeenCalledWith(
				DbLock.WORKFLOW_REVIEW_REQUEST_CREATE,
				expect.any(Function),
			);
			expect(requestRepository.findOpenRequestsForWorkflows).toHaveBeenCalledWith(['wf-1'], ctx);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				{
					workflowReviewRequestId: 'req-1',
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'user' },
					createdById: 'user-9',
				},
				ctx,
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				{
					workflowReviewRequestId: 'req-1',
					type: 'review.closed',
					data: { reason: 'no-reviewable-workflows' },
					createdById: null,
				},
				ctx,
			);
			expect(requestRepository.saveRequest).toHaveBeenCalledExactlyOnceWith(request, ctx);
			expect(request.state).toBe('closed');
			expect(request.decision).toBe('changes_requested');
			expect(request.closedById).toBeNull();
			expect(request.updatedById).toBe('user-2');
			expect(
				collaborationService.broadcastWorkflowReviewStateChanged,
			).toHaveBeenCalledExactlyOnceWith('wf-1');
		});

		it('attributes a system archive (no user) as a system actor', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{
					request: openRequest(),
					links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }],
				},
			]);

			await service.afterWorkflowArchived('wf-1', null);

			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'system' },
					createdById: null,
				}),
				ctx,
			);
		});

		it('leaves the request open while a reviewable workflow remains outside the affected set', async () => {
			const request = openRequest();
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			]);
			requestRepository.hasReviewableWorkflowOutside.mockResolvedValue(true);

			await service.afterWorkflowArchived('wf-1', 'user-9');

			expect(requestRepository.hasReviewableWorkflowOutside).toHaveBeenCalledWith(
				'req-1',
				['wf-1'],
				ctx,
			);
			// The cause entry is still recorded; only the close is withheld.
			expect(activityRepository.createActivity).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ type: 'workflow.archived' }),
				ctx,
			);
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
			expect(request.state).toBe('open');
		});

		it('does nothing when no open request is linked — no write, no broadcast', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

			await service.afterWorkflowArchived('wf-1', 'user-9');

			expect(activityRepository.createActivity).not.toHaveBeenCalled();
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('swallows and logs repository errors instead of failing the workflow mutation', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowArchived('wf-1', 'user-9')).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
		});
	});

	describe('transfer', () => {
		it('records workflow.moved for each open request and broadcasts once per affected workflow', async () => {
			const first = openRequest({ id: 'req-1' });
			const second = openRequest({ id: 'req-2' });
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request: first, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
				{ request: second, links: [{ workflowId: 'wf-2', workflowVersionId: 'wfv-2' }] },
			]);

			await service.afterWorkflowsTransferred(['wf-1', 'wf-2', 'wf-3'], 'user-9');

			expect(requestRepository.findOpenRequestsForWorkflows).toHaveBeenCalledWith(
				['wf-1', 'wf-2', 'wf-3'],
				ctx,
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowReviewRequestId: 'req-1',
					type: 'workflow.moved',
					data: { workflowId: 'wf-1', actorKind: 'user' },
					createdById: 'user-9',
				}),
				ctx,
			);
			expect(first.state).toBe('closed');
			expect(second.state).toBe('closed');
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(2);
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
			expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-2');
		});

		it('swallows repository errors on transfer too — the move already committed', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsTransferred(['wf-1'], 'user-9')).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('captures before the delete without writing anything', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{
					request: openRequest(),
					links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }],
				},
			]);

			await service.beforeWorkflowDeleted('wf-1', 'user-9');

			expect(requestRepository.findOpenRequestsForWorkflows).toHaveBeenCalledWith(['wf-1'], {});
			expect(activityRepository.createActivity).not.toHaveBeenCalled();
			expect(requestRepository.saveRequest).not.toHaveBeenCalled();
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		// The delete has not happened yet and must not be aborted by review bookkeeping;
		// a lost capture degrades to the sweep, which closes without a cause entry.
		it('never throws from the capture, even when the repository fails', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

			await expect(service.beforeWorkflowDeleted('wf-1', 'user-9')).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalled();
		});

		it('records the captured deletion and closes, after the delete committed', async () => {
			const request = openRequest();
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			]);
			await service.beforeWorkflowDeleted('wf-1', 'user-9');
			requestRepository.findById.mockResolvedValue(request);

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				{
					workflowReviewRequestId: 'req-1',
					type: 'workflow.deleted',
					data: { workflowId: 'wf-1', actorKind: 'user' },
					createdById: 'user-9',
				},
				ctx,
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'review.closed' }),
				ctx,
			);
			expect(request.state).toBe('closed');
			expect(
				collaborationService.broadcastWorkflowReviewStateChanged,
			).toHaveBeenCalledExactlyOnceWith('wf-1');
		});

		it('evaluates a batch as one affected set: per-workflow cause entries, one close', async () => {
			const request = openRequest();
			requestRepository.findOpenRequestsForWorkflows.mockImplementation(async ([workflowId]) => [
				{ request, links: [{ workflowId, workflowVersionId: `wfv-${workflowId}` }] },
			]);
			await service.beforeWorkflowDeleted('wf-1', 'user-9');
			await service.beforeWorkflowDeleted('wf-2', 'user-9');
			requestRepository.findById.mockResolvedValue(request);

			await service.afterWorkflowsDeleted(['wf-1', 'wf-2']);

			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflow.deleted',
					data: { workflowId: 'wf-1', actorKind: 'user' },
				}),
				ctx,
			);
			expect(activityRepository.createActivity).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'workflow.deleted',
					data: { workflowId: 'wf-2', actorKind: 'user' },
				}),
				ctx,
			);
			// The whole batch is the affected set, so a deleted batch-mate cannot pass
			// for a still-reviewable workflow.
			expect(requestRepository.hasReviewableWorkflowOutside).toHaveBeenCalledExactlyOnceWith(
				'req-1',
				['wf-1', 'wf-2'],
				ctx,
			);
			expect(
				activityRepository.createActivity.mock.calls.filter(
					([input]) => input.type === 'review.closed',
				),
			).toHaveLength(1);
		});

		it('records nothing for a request that closed between capture and delete', async () => {
			const request = openRequest();
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			]);
			await service.beforeWorkflowDeleted('wf-1', 'user-9');
			requestRepository.findById.mockResolvedValue(openRequest({ state: 'closed' }));

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(activityRepository.createActivity).not.toHaveBeenCalled();
		});

		it('consumes the capture: a second after-hook for the same workflow records nothing', async () => {
			const request = openRequest();
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
				{ request, links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }] },
			]);
			await service.beforeWorkflowDeleted('wf-1', 'user-9');
			requestRepository.findById.mockResolvedValue(request);

			await service.afterWorkflowsDeleted(['wf-1']);
			activityRepository.createActivity.mockClear();

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(activityRepository.createActivity).not.toHaveBeenCalled();
		});

		it('degrades to the sweep when nothing was captured', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue(['req-9']);

			await service.afterWorkflowsDeleted(['wf-1']);

			// Close without a cause entry: the cause is unrecoverable after the cascade.
			expect(activityRepository.createActivity).toHaveBeenCalledExactlyOnceWith(
				{
					workflowReviewRequestId: 'req-9',
					type: 'review.closed',
					data: { reason: 'no-reviewable-workflows' },
					createdById: null,
				},
				ctx,
			);
		});

		// The delete already committed, so there is nothing left to abort.
		it('swallows repository errors after a delete', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsDeleted(['wf-1', 'wf-2'])).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledExactlyOnceWith(
				expect.any(String),
				expect.objectContaining({ workflowIds: ['wf-1', 'wf-2'] }),
			);
		});
	});

	describe('publish recorder', () => {
		it('appends workflow.published to every request pinned to the published version', async () => {
			requestWorkflowRepository.findRequestIdsPinnedToVersion.mockResolvedValue(['req-1', 'req-2']);

			await service.afterWorkflowPublished({
				workflowId: 'wf-1',
				versionId: 'v-1',
				userId: 'user-9',
			});

			expect(requestWorkflowRepository.findRequestIdsPinnedToVersion).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', workflowVersionId: 'v-1' },
				{},
			);
			for (const requestId of ['req-1', 'req-2']) {
				expect(activityRepository.createActivity).toHaveBeenCalledWith(
					{
						workflowReviewRequestId: requestId,
						type: 'workflow.published',
						data: { workflowId: 'wf-1', workflowVersionId: 'v-1' },
						createdById: 'user-9',
					},
					{},
				);
			}
			expect(
				collaborationService.broadcastWorkflowReviewStateChanged,
			).toHaveBeenCalledExactlyOnceWith('wf-1');
		});

		// The banner derives from review state plus the published version, so a publish
		// invalidates viewers even when it lands in no feed.
		it('records nothing when no request is pinned to the published version, but still broadcasts', async () => {
			requestWorkflowRepository.findRequestIdsPinnedToVersion.mockResolvedValue([]);

			await service.afterWorkflowPublished({
				workflowId: 'wf-1',
				versionId: 'v-1',
				userId: 'user-9',
			});

			expect(activityRepository.createActivity).not.toHaveBeenCalled();
			expect(
				collaborationService.broadcastWorkflowReviewStateChanged,
			).toHaveBeenCalledExactlyOnceWith('wf-1');
		});

		// The publication stands whatever happens to its feed entry.
		it('only warns when the recorder fails, never throws to the publish caller', async () => {
			requestWorkflowRepository.findRequestIdsPinnedToVersion.mockRejectedValue(
				new Error('db down'),
			);

			await expect(
				service.afterWorkflowPublished({ workflowId: 'wf-1', versionId: 'v-1', userId: 'u-1' }),
			).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('reconciliation sweep', () => {
		it('closes the requests the mutation stranded and explains each of them', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue(['req-9']);

			await service.afterWorkflowArchived('wf-1', 'user-9');

			// Same lock and same transaction as every other close path: the sweep updates the
			// requests it selected by id, so two racing sweeps would otherwise explain the same
			// close twice. The sweep is global, so the batch never reaches the query; it is log
			// context only.
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);
			expect(activityRepository.createActivity).toHaveBeenCalledExactlyOnceWith(
				{
					workflowReviewRequestId: 'req-9',
					type: 'review.closed',
					data: { reason: 'no-reviewable-workflows' },
					createdById: null,
				},
				ctx,
			);
		});

		it('stays quiet when nothing is left unreviewable', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue([]);

			await service.afterWorkflowsDeleted(['wf-1']);

			expect(logger.info).not.toHaveBeenCalled();
		});

		// The close and its explanation share one transaction, so an unwritable entry rolls the
		// close back and the next sweep picks the review up again.
		it('leaves a review it cannot explain to the next sweep', async () => {
			requestRepository.closeUnreviewableOpenRequests.mockResolvedValue(['req-9']);
			activityRepository.createActivity.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowsDeleted(['wf-1'])).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
		});

		// An archive or a move whose close rolled back stays committed, so the sweep has to run
		// there too — the targeted close is done with the review by then.
		it('runs after the targeted close on archive, and again on transfer', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

			await service.afterWorkflowArchived('wf-1', 'user-9');
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);

			await service.afterWorkflowsTransferred(['wf-2'], 'user-9');
			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledTimes(2);
		});

		// A close that rolled back is exactly what the sweep is there to repair, so a throwing
		// targeted close must not skip it.
		it('still runs when the targeted close on archive failed', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockRejectedValue(new Error('db down'));

			await expect(service.afterWorkflowArchived('wf-1', 'user-9')).resolves.toBeUndefined();

			expect(requestRepository.closeUnreviewableOpenRequests).toHaveBeenCalledExactlyOnceWith(ctx);
		});

		// The pre-delete hook only captures; reconciliation waits for the delete to commit.
		it('does not run before a delete', async () => {
			requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([]);

			await service.beforeWorkflowDeleted('wf-1', 'user-9');

			expect(requestRepository.closeUnreviewableOpenRequests).not.toHaveBeenCalled();
		});
	});

	it('a failed broadcast is only warned about, never thrown', async () => {
		requestRepository.findOpenRequestsForWorkflows.mockResolvedValue([
			{
				request: openRequest(),
				links: [{ workflowId: 'wf-1', workflowVersionId: 'wfv-1' }],
			},
		]);
		collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
			new Error('push down'),
		);

		await expect(service.afterWorkflowArchived('wf-1', 'user-9')).resolves.toBeUndefined();

		// Let the fire-and-forget rejection settle before asserting.
		await new Promise(process.nextTick);
		expect(logger.warn).toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
	});
});
