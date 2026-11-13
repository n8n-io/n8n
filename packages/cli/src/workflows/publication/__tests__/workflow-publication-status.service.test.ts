import {
	UNPUBLISH_VERSION_SENTINEL,
	type OperationContext,
	type Transaction,
	type WorkflowPublicationOutbox,
	type WorkflowPublicationOutboxRepository,
	type WorkflowPublicationTriggerStatus,
	type WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { UNKNOWN_FAILURE_REASON } from '@/constants';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

describe('WorkflowPublicationStatusService', () => {
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const triggerStatusRepository = mock<WorkflowPublicationTriggerStatusRepository>();

	const service = new WorkflowPublicationStatusService(outboxRepository, triggerStatusRepository);

	const WORKFLOW_ID = 'wf-1';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeOutbox(
		overrides: Partial<WorkflowPublicationOutbox> = {},
	): WorkflowPublicationOutbox {
		return {
			id: 1,
			workflowId: WORKFLOW_ID,
			publishedVersionId: 'v-2',
			status: 'completed',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationOutbox;
	}

	function makeRow(
		overrides: Partial<WorkflowPublicationTriggerStatus> = {},
	): WorkflowPublicationTriggerStatus {
		return {
			workflowId: WORKFLOW_ID,
			nodeId: 'node-1',
			versionId: 'v-2',
			status: 'activated',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationTriggerStatus;
	}

	it('reads publication state through the active transaction', async () => {
		const ctx: OperationContext = { trx: mock<Transaction>() };
		outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
		triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

		await service.getStatus(WORKFLOW_ID, ctx);

		expect(outboxRepository.findInFlightByWorkflowId).toHaveBeenCalledExactlyOnceWith(
			WORKFLOW_ID,
			ctx,
		);
		expect(triggerStatusRepository.findByWorkflowId).toHaveBeenCalledExactlyOnceWith(
			WORKFLOW_ID,
			ctx,
		);
	});

	describe('never published (no rows, no in-flight publication)', () => {
		it('returns not_published with null versions', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
			expect(result.triggers).toEqual([]);
		});
	});

	describe('first publish in flight (no rows; in-flight in_progress)', () => {
		it('returns in_progress with pending version and null live version', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'in_progress', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBe('v-2');
			expect(result.triggers).toEqual([]);
		});
	});

	describe('first publish pending (no rows; in-flight pending)', () => {
		it('returns in_progress with pending version and null live version', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'pending', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBe('v-2');
			expect(result.triggers).toEqual([]);
		});
	});

	describe('republish over live v1 (rows v1 all activated; in-flight in_progress pubVer v2)', () => {
		it('returns in_progress with live v1 and pending v2', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'in_progress', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ versionId: 'v-1', status: 'activated' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBe('v-1');
			expect(result.pendingVersionId).toBe('v-2');
		});
	});

	describe('all triggers up (rows v2 all activated; no in-flight publication)', () => {
		it('returns published with live v2 and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'activated' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'activated' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('published');
			expect(result.liveVersionId).toBe('v-2');
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('mixed (rows v2: ≥1 activated, ≥1 failed)', () => {
		it('returns partial with live v2 and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'activated' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'failed', errorMessage: 'oops' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('partial');
			expect(result.liveVersionId).toBe('v-2');
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('all failed (rows v2 all failed)', () => {
		it('returns failed with null live version and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'failed', errorMessage: 'err1' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'failed', errorMessage: 'err2' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('failed');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('no rows, no in-flight publication (e.g. a prior publish failed terminally)', () => {
		it('returns not_published: settled state comes from rows, terminal outbox is not consulted', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('unpublished (rows cleared; no in-flight publication)', () => {
		it('returns not_published with null versions', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('triggers field mirrors the rows', () => {
		it('maps nodeId, status, errorMessage from rows', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({
					nodeId: 'n1',
					status: 'activated',
					errorMessage: null,
				}),
				makeRow({
					nodeId: 'n2',
					status: 'failed',
					errorMessage: 'schedule parse error',
				}),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.triggers).toEqual([
				{ nodeId: 'n1', status: 'activated', errorMessage: null },
				{ nodeId: 'n2', status: 'failed', errorMessage: 'schedule parse error' },
			]);
		});
	});

	describe('getListStatusesByWorkflowIds', () => {
		it('derives per-workflow terminal status and omits workflows with no rows', async () => {
			triggerStatusRepository.getStatusCountsByWorkflowIds.mockResolvedValue(
				new Map([
					['wf-ok', { total: 2, failed: 0 }],
					['wf-partial', { total: 3, failed: 1 }],
					['wf-failed', { total: 2, failed: 2 }],
				]),
			);

			const statuses = await service.getListStatusesByWorkflowIds([
				'wf-ok',
				'wf-partial',
				'wf-failed',
				'wf-none',
			]);

			expect(statuses.get('wf-ok')).toBe('published');
			expect(statuses.get('wf-partial')).toBe('partial');
			expect(statuses.get('wf-failed')).toBe('failed');
			expect(statuses.has('wf-none')).toBe(false);
		});

		it('does not consult the outbox (terminal states only)', async () => {
			triggerStatusRepository.getStatusCountsByWorkflowIds.mockResolvedValue(new Map());
			await service.getListStatusesByWorkflowIds(['wf-a']);
			expect(outboxRepository.findInFlightByWorkflowId).not.toHaveBeenCalled();
		});
	});

	describe('publication outcomes for callers', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(makeOutbox());
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('reports a terminal failure even when it has no trigger rows', async () => {
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'failed', errorMessage: 'Published version not found' }),
			);

			await expect(service.getLatestStatus(WORKFLOW_ID)).resolves.toMatchObject({
				status: 'failed',
				versionId: 'v-2',
				liveVersionId: null,
				errorMessage: 'Published version not found',
			});
		});

		it('keeps a completed unpublish inactive even when its record names the old version', async () => {
			await expect(service.getLatestStatus(WORKFLOW_ID)).resolves.toMatchObject({
				status: 'not_published',
				liveVersionId: null,
			});
		});

		it('keeps settled trigger errors available after outbox cleanup', async () => {
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ status: 'failed', errorMessage: 'Invalid interval' }),
			]);

			await expect(service.getLatestStatus(WORKFLOW_ID)).resolves.toMatchObject({
				status: 'failed',
				versionId: 'v-2',
				liveVersionId: null,
				errorMessage: 'Invalid interval',
				triggers: [{ status: 'failed', errorMessage: 'Invalid interval' }],
			});
			await expect(service.waitForPublication(WORKFLOW_ID, 'v-2')).resolves.toMatchObject({
				status: 'failed',
				versionId: 'v-2',
				errorMessage: 'Invalid interval',
			});
		});

		it.each([
			{ status: 'failed', publishedVersionId: 'v-1' },
			{ status: 'failed', publishedVersionId: 'v-2' },
			{ status: 'partial_success', publishedVersionId: 'v-1' },
			{ status: 'partial_success', publishedVersionId: 'v-2' },
		] as const)(
			'ignores an older retained $status outcome for $publishedVersionId after a newer success',
			async ({ status, publishedVersionId }) => {
				outboxRepository.findLatestByWorkflowId.mockResolvedValue(
					makeOutbox({
						status,
						publishedVersionId,
						errorMessage: 'Old activation error',
						updatedAt: new Date('2026-11-01T00:00:00Z'),
					}),
				);
				triggerStatusRepository.findByWorkflowId.mockResolvedValue([
					makeRow({ updatedAt: new Date('2026-11-02T00:00:00Z') }),
				]);

				await expect(service.getLatestStatus(WORKFLOW_ID)).resolves.toMatchObject({
					status: 'published',
					versionId: 'v-2',
					liveVersionId: 'v-2',
					errorMessage: null,
				});
				await expect(service.waitForPublication(WORKFLOW_ID, 'v-2')).resolves.toMatchObject({
					status: 'published',
					versionId: 'v-2',
				});
			},
		);

		it('reports a newer failure that leaves the previous version running', async () => {
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(
				makeOutbox({
					status: 'failed',
					errorMessage: 'Published version not found',
					updatedAt: new Date('2026-11-02T00:00:00Z'),
				}),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ versionId: 'v-1', updatedAt: new Date('2026-11-01T00:00:00Z') }),
			]);

			await expect(service.waitForPublication(WORKFLOW_ID, 'v-2')).resolves.toMatchObject({
				status: 'failed',
				versionId: 'v-2',
				liveVersionId: 'v-1',
				errorMessage: 'Published version not found',
			});
		});

		it.each(['v-2', UNPUBLISH_VERSION_SENTINEL])(
			'stops waiting when a completed unpublish replaces the request with %s',
			async (publishedVersionId) => {
				outboxRepository.findLatestByWorkflowId.mockResolvedValue(
					makeOutbox({ publishedVersionId }),
				);
				await expect(service.getLatestStatus(WORKFLOW_ID)).resolves.toMatchObject({
					status: 'not_published',
					versionId: publishedVersionId === UNPUBLISH_VERSION_SENTINEL ? null : publishedVersionId,
				});
				const onRejected = vi.fn();
				const result = service.waitForPublication(WORKFLOW_ID, 'v-2');
				void result.catch(onRejected);

				await vi.advanceTimersByTimeAsync(100);

				expect(onRejected).toHaveBeenCalledWith(
					expect.objectContaining({ message: expect.stringContaining('replaced this request') }),
				);
				expect(vi.getTimerCount()).toBe(0);
			},
		);

		it('does not confirm success from another live version', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([makeRow({ versionId: 'v-1' })]);
			const settled = vi.fn();
			const result = service.waitForPublication(WORKFLOW_ID, 'v-2');
			void result.then(settled);

			await vi.advanceTimersByTimeAsync(100);
			expect(settled).not.toHaveBeenCalled();

			triggerStatusRepository.findByWorkflowId.mockResolvedValue([makeRow({ versionId: 'v-2' })]);
			await vi.advanceTimersByTimeAsync(100);
			await expect(result).resolves.toMatchObject({ status: 'published', liveVersionId: 'v-2' });
		});

		it.each(['failed', 'partial_success'] as const)(
			'waits for the requested version before returning %s',
			async (status) => {
				const record = makeOutbox({ status: 'in_progress' });
				outboxRepository.findLatestByWorkflowId.mockResolvedValue(record);
				outboxRepository.findInFlightByWorkflowId.mockResolvedValue(record);
				triggerStatusRepository.findByWorkflowId.mockResolvedValue([makeRow({ versionId: 'v-1' })]);
				const settled = vi.fn();
				const result = service.waitForPublication(WORKFLOW_ID, 'v-2');
				void result.then(settled);

				await vi.advanceTimersByTimeAsync(100);
				expect(settled).not.toHaveBeenCalled();

				outboxRepository.findLatestByWorkflowId.mockResolvedValue(
					makeOutbox({ status, errorMessage: 'Invalid interval' }),
				);
				outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
				triggerStatusRepository.findByWorkflowId.mockResolvedValue([
					makeRow({ status: 'failed', errorMessage: 'Invalid interval' }),
					...(status === 'partial_success' ? [makeRow({ nodeId: 'valid' })] : []),
				]);
				await vi.advanceTimersByTimeAsync(100);

				await expect(result).resolves.toMatchObject({
					status: status === 'failed' ? 'failed' : 'partial',
					versionId: 'v-2',
					errorMessage: 'Invalid interval',
				});
				expect(vi.getTimerCount()).toBe(0);
			},
		);

		it('does not accept another version as the requested publication outcome', async () => {
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(
				makeOutbox({ publishedVersionId: 'v-3' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([makeRow({ versionId: 'v-3' })]);

			await expect(service.waitForPublication(WORKFLOW_ID, 'v-2')).rejects.toThrow(
				'Another publication replaced this request',
			);
		});

		it('stops polling at the deadline and returns a pending status', async () => {
			outboxRepository.findLatestByWorkflowId.mockResolvedValue(makeOutbox({ status: 'pending' }));
			const result = service.waitForPublication(WORKFLOW_ID, 'v-2');

			await vi.advanceTimersByTimeAsync(5_000);
			await expect(result).resolves.toMatchObject({
				status: 'in_progress',
				versionId: 'v-2',
				pendingVersionId: 'v-2',
			});
			const calls = outboxRepository.findLatestByWorkflowId.mock.calls.length;
			await vi.advanceTimersByTimeAsync(1_000);
			expect(outboxRepository.findLatestByWorkflowId).toHaveBeenCalledTimes(calls);
			expect(vi.getTimerCount()).toBe(0);
		});

		it('bounds the wait even when a status read does not finish', async () => {
			outboxRepository.findLatestByWorkflowId.mockReturnValue(new Promise(() => {}));
			const result = service.waitForPublication(WORKFLOW_ID, 'v-2');

			await vi.advanceTimersByTimeAsync(5_000);
			await expect(result).resolves.toMatchObject({
				status: 'in_progress',
				pendingVersionId: 'v-2',
			});
			expect(outboxRepository.findLatestByWorkflowId).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('getFailedActivationError', () => {
		const nodes = [
			{ id: 'node-1', name: 'Webhook' },
			{ id: 'node-2', name: 'Schedule' },
		];

		it('returns null without consulting the outbox when there are no rows', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, nodes)).toBeNull();

			expect(triggerStatusRepository.findByWorkflowId).toHaveBeenCalledWith(WORKFLOW_ID);
			expect(outboxRepository.findInFlightByWorkflowId).not.toHaveBeenCalled();
		});

		it('returns null when every trigger activated', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', status: 'activated' }),
				makeRow({ nodeId: 'node-2', status: 'activated' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, nodes)).toBeNull();
		});

		it('returns null for a partial publication', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', status: 'activated' }),
				makeRow({ nodeId: 'node-2', status: 'failed', errorMessage: 'err2' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, nodes)).toBeNull();
		});

		it('returns a single failure verbatim', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', status: 'failed', errorMessage: 'err1' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, nodes)).toBe('err1');
		});

		it("orders several failures by the caller's node order, not by id", async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', status: 'failed', errorMessage: 'err1' }),
				makeRow({ nodeId: 'node-2', status: 'failed', errorMessage: 'err2' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, [nodes[1], nodes[0]])).toBe(
				'Triggers failed to activate: "Schedule": err2; "Webhook": err1',
			);
		});

		it('falls back to the node id for a node the caller does not know, after the known ones', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'deleted-node', status: 'failed', errorMessage: 'err2' }),
				makeRow({ nodeId: 'node-1', status: 'failed', errorMessage: 'err1' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, [nodes[0]])).toBe(
				'Triggers failed to activate: "Webhook": err1; "deleted-node": err2',
			);
		});

		it('orders several unknown ids by id, so the message is stable', async () => {
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-9', status: 'failed', errorMessage: 'err9' }),
				makeRow({ nodeId: 'node-8', status: 'failed', errorMessage: 'err8' }),
				makeRow({ nodeId: 'node-1', status: 'failed', errorMessage: 'err1' }),
			]);

			expect(await service.getFailedActivationError(WORKFLOW_ID, [nodes[0]])).toBe(
				'Triggers failed to activate: "Webhook": err1; "node-8": err8; "node-9": err9',
			);
		});

		it.each([null, ''])(
			'reports an unknown reason for an empty error message (%j)',
			async (errorMessage) => {
				triggerStatusRepository.findByWorkflowId.mockResolvedValue([
					makeRow({ nodeId: 'node-1', status: 'failed', errorMessage }),
				]);

				expect(await service.getFailedActivationError(WORKFLOW_ID, nodes)).toBe(
					UNKNOWN_FAILURE_REASON,
				);
			},
		);
	});
});
