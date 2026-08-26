import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	OperationContext,
	PollLeaseFence,
	PollerStateRepository,
	TransactionRunner,
} from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';

describe('PollCursorService', () => {
	const logger = mock<Logger>();
	const pollerStateRepository = mock<PollerStateRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const eventService = mock<EventService>();

	let txRunner: MockProxy<TransactionRunner>;

	const buildService = (
		durableCursorsEnabled = true,
		{
			schedulerEnabled = true,
			schedulerEnabledForPollTriggers = true,
			useWorkflowPublicationService = true,
		} = {},
	) => {
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);

		return new PollCursorService(
			logger,
			pollerStateRepository,
			txRunner,
			executionPersistence,
			mock<SchedulerConfig>({
				enabled: schedulerEnabled,
				enabledForPollTriggers: schedulerEnabledForPollTriggers,
				durableCursorsEnabled,
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService }),
			eventService,
		);
	};

	const payload = (): CreateExecutionPayload =>
		({
			mode: 'trigger',
			finished: false,
			status: 'new',
			workflowId: 'wf-1',
			workflowData: mock<IWorkflowBase>({ id: 'wf-1' }),
		}) as CreateExecutionPayload;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('enabled', () => {
		it('requires the config flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
		});

		it('requires the workflow publication service: legacy activation must never create cursor rows', () => {
			expect(buildService(true, { useWorkflowPublicationService: false }).enabled).toBe(false);
		});

		it('requires the durable scheduler and durable pollers to be enabled', () => {
			expect(
				buildService(true, { schedulerEnabled: false, schedulerEnabledForPollTriggers: true })
					.enabled,
			).toBe(false);
			expect(
				buildService(true, { schedulerEnabled: true, schedulerEnabledForPollTriggers: false })
					.enabled,
			).toBe(false);
			expect(
				buildService(true, {
					schedulerEnabled: false,
					schedulerEnabledForPollTriggers: false,
				}).enabled,
			).toBe(false);
		});

		it('warns once when durable cursors are configured without the scheduler chain', () => {
			buildService(true, { schedulerEnabled: true, schedulerEnabledForPollTriggers: false });

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('N8N_POLLER_DURABLE_CURSORS_ENABLED'),
			);
		});

		it('does not warn when durable cursors are off, whatever the scheduler flags', () => {
			buildService(false, {
				schedulerEnabled: false,
				schedulerEnabledForPollTriggers: false,
			});

			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('does not warn when the full chain is enabled', () => {
			buildService(true);

			expect(logger.warn).not.toHaveBeenCalled();
		});
	});

	describe('resolveCursor', () => {
		it('seeds getOrCreateCursor from the static-data blob and returns the stored cursor when the flag is on', async () => {
			const service = buildService(true);
			let seenSeed: unknown;
			pollerStateRepository.getOrCreateCursor.mockImplementationOnce(async (_wf, _node, seed) => {
				seenSeed = { ...seed };
				return { lastItemId: 'from-db' };
			});

			const resolved = await service.resolveCursor('wf-1', 'node-1', {
				lastItemId: 'from-static-data',
			});

			expect(seenSeed).toEqual({ lastItemId: 'from-static-data' });
			expect(resolved).toEqual({ migrated: true, cursor: { lastItemId: 'from-db' } });
			expect(txRunner.run).toHaveBeenCalledTimes(1);
			expect(pollerStateRepository.getOrCreateCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				expect.anything(),
				txRunner.run.mock.calls[0][0],
			);
		});

		it('uses a prefetched cursor without any read or transaction when the flag is on', async () => {
			const service = buildService(true);

			const resolved = await service.resolveCursor(
				'wf-1',
				'node-1',
				{ lastItemId: 'from-static-data' },
				{ lastItemId: 'prefetched' },
			);

			expect(resolved).toEqual({ migrated: true, cursor: { lastItemId: 'prefetched' } });
			expect(pollerStateRepository.getOrCreateCursor).not.toHaveBeenCalled();
			expect(pollerStateRepository.findCursor).not.toHaveBeenCalled();
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('treats an empty prefetched cursor as a stored cursor, not a missing one', async () => {
			const service = buildService(true);

			const resolved = await service.resolveCursor('wf-1', 'node-1', { lastItemId: 'seed' }, {});

			expect(resolved).toEqual({ migrated: true, cursor: {} });
			expect(pollerStateRepository.getOrCreateCursor).not.toHaveBeenCalled();
		});

		it('falls back to getOrCreateCursor when no cursor was prefetched', async () => {
			const service = buildService(true);
			pollerStateRepository.getOrCreateCursor.mockResolvedValue({ lastItemId: 'from-db' });

			const resolved = await service.resolveCursor(
				'wf-1',
				'node-1',
				{ lastItemId: 'seed' },
				undefined,
			);

			expect(resolved).toEqual({ migrated: true, cursor: { lastItemId: 'from-db' } });
			expect(pollerStateRepository.getOrCreateCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'seed' },
				expect.anything(),
			);
		});

		it('does not create a row when the flag is off and the node has never migrated', async () => {
			const service = buildService(false);
			pollerStateRepository.findCursor.mockResolvedValue(null);

			await expect(service.resolveCursor('wf-1', 'node-1', {})).resolves.toEqual({
				migrated: false,
			});

			expect(pollerStateRepository.getOrCreateCursor).not.toHaveBeenCalled();
		});

		it('still prefers an existing row when the flag is off', async () => {
			const service = buildService(false);
			pollerStateRepository.findCursor.mockResolvedValue({ lastItemId: 'from-db' });

			const resolved = await service.resolveCursor('wf-1', 'node-1', {});

			expect(resolved).toEqual({ migrated: true, cursor: { lastItemId: 'from-db' } });
			expect(pollerStateRepository.getOrCreateCursor).not.toHaveBeenCalled();
		});

		it('propagates a failing read so the poll does not run against an unknown cursor', async () => {
			const service = buildService();
			const readError = new Error('poller state read failed');
			pollerStateRepository.getOrCreateCursor.mockRejectedValue(readError);

			await expect(service.resolveCursor('wf-1', 'node-1', {})).rejects.toBe(readError);
		});
	});

	describe('commitWithExecution', () => {
		it('advances the cursor and creates the execution in one transaction when the flag is on', async () => {
			const service = buildService(true);
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const result = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(result).toEqual({ executionId: 'exec-1' });
			expect(txRunner.run).toHaveBeenCalledTimes(1);

			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
				undefined,
			);
			expect(executionPersistence.create).toHaveBeenCalledWith(createPayload, ctx);
		});

		it('advances the cursor and creates the execution as two separate writes when the flag is off', async () => {
			const service = buildService(false);
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const result = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(result).toEqual({ executionId: 'exec-1' });
			expect(txRunner.run).not.toHaveBeenCalled();
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				{},
				undefined,
			);
			expect(executionPersistence.create).toHaveBeenCalledWith(createPayload, {});
		});

		// The transaction runner is a pass-through here, so this only pins that the insert
		// is never reached once the advance fails. The rollback itself is proven in
		// test/integration/executions/poll-cursor-atomicity.test.ts.
		it('does not create the execution when the cursor advance fails', async () => {
			const service = buildService();
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toBe(advanceError);

			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		// The transaction runner is a pass-through here, so these only pin that the failure
		// reaches the caller and nothing swallows it. The rollback itself is proven in
		// test/integration/executions/poll-cursor-atomicity.test.ts.
		it.each([
			{ title: 'a failing execution insert', error: new Error('insert failed') },
			{ title: 'a duplicate execution', error: new DuplicateExecutionError('dedup-key') },
		])('propagates $title to the caller', async ({ error }) => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			executionPersistence.create.mockRejectedValue(error);

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toBe(error);
		});

		it.each([
			{ title: 'the flag is on', durableCursorsEnabled: true },
			{ title: 'the flag is off', durableCursorsEnabled: false },
		])(
			'resolves null and does not create the execution when the fence rejects the advance and $title',
			async ({ durableCursorsEnabled }) => {
				const service = buildService(durableCursorsEnabled);
				pollerStateRepository.advanceCursor.mockResolvedValue(false);
				const fence: PollLeaseFence = { taskId: 'task-1', leaseEpoch: 3 };

				const result = await service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
					fence,
				});

				expect(result).toBeNull();
				expect(executionPersistence.create).not.toHaveBeenCalled();
			},
		);

		it('passes the fence through to the cursor advance', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			executionPersistence.create.mockResolvedValue('exec-1');
			const fence: PollLeaseFence = { taskId: 'task-1', leaseEpoch: 3 };

			await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: payload(),
				fence,
			});

			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
				fence,
			);
		});
	});

	describe('commitCursorOnly', () => {
		const commitCursorOnly = async (service: PollCursorService, fence?: PollLeaseFence) =>
			await service.commitCursorOnly({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				fence,
			});

		it('advances the cursor without creating an execution', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);

			await expect(commitCursorOnly(service)).resolves.toBe(true);

			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				{},
				undefined,
			);
			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		it('propagates a failing advance', async () => {
			const service = buildService();
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(commitCursorOnly(service)).rejects.toBe(advanceError);
		});

		it('resolves false when the fence rejects the advance', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(false);

			await expect(commitCursorOnly(service, { taskId: 'task-1', leaseEpoch: 3 })).resolves.toBe(
				false,
			);
		});

		it('passes the fence through to the cursor advance', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			const fence: PollLeaseFence = { taskId: 'task-1', leaseEpoch: 3 };

			await commitCursorOnly(service, fence);

			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				{},
				fence,
			);
		});
	});

	describe('metrics events', () => {
		const expectSettledEvent = (operation: string, result: string) => {
			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('poll-cursor-commit-settled', {
				operation,
				result,
				durationMs: expect.any(Number),
			});
		};

		it('emits a success event when commitWithExecution advances the cursor', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			executionPersistence.create.mockResolvedValue('exec-1');

			await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: payload(),
			});

			expectSettledEvent('with_execution', 'success');
		});

		it('emits a fence_rejected event when the fence rejects commitWithExecution', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(false);

			await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: payload(),
				fence: { taskId: 'task-1', leaseEpoch: 3 },
			});

			expectSettledEvent('with_execution', 'fence_rejected');
		});

		it('emits a failure event when commitWithExecution throws', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockRejectedValue(new Error('write failed'));

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toThrow('write failed');

			expectSettledEvent('with_execution', 'failure');
		});

		it('emits a success event when commitCursorOnly advances the cursor', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);

			await service.commitCursorOnly({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
			});

			expectSettledEvent('cursor_only', 'success');
		});

		it('emits a fence_rejected event when the fence rejects commitCursorOnly', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(false);

			await service.commitCursorOnly({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				fence: { taskId: 'task-1', leaseEpoch: 3 },
			});

			expectSettledEvent('cursor_only', 'fence_rejected');
		});

		it('does not let a throwing event sink fail a commit', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockResolvedValue(true);
			eventService.emit.mockImplementation(() => {
				throw new Error('metrics sink failed');
			});

			await expect(
				service.commitCursorOnly({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
				}),
			).resolves.toBe(true);
		});

		it('emits a failure event when commitCursorOnly throws', async () => {
			const service = buildService();
			pollerStateRepository.advanceCursor.mockRejectedValue(new Error('write failed'));

			await expect(
				service.commitCursorOnly({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
				}),
			).rejects.toThrow('write failed');

			expectSettledEvent('cursor_only', 'failure');
		});
	});
});
