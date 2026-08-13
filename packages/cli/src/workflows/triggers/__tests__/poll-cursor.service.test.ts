import type { PollerConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	OperationContext,
	PollerStateRepository,
	TransactionRunner,
} from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';

describe('PollCursorService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const executionPersistence = mock<ExecutionPersistence>();

	let txRunner: MockProxy<TransactionRunner>;

	const buildService = (durableCursorsEnabled = true) => {
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);

		return new PollCursorService(
			pollerStateRepository,
			txRunner,
			executionPersistence,
			mock<PollerConfig>({ durableCursorsEnabled }),
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
		it('reports the configured flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
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
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const { executionId } = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(executionId).toBe('exec-1');
			expect(txRunner.run).toHaveBeenCalledTimes(1);

			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(executionPersistence.create).toHaveBeenCalledWith(createPayload, ctx);
		});

		it('advances the cursor and creates the execution as two separate writes when the flag is off', async () => {
			const service = buildService(false);
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const { executionId } = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(executionId).toBe('exec-1');
			expect(txRunner.run).not.toHaveBeenCalled();
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				{},
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
	});

	describe('commitCursorOnly', () => {
		const commitCursorOnly = async (service: PollCursorService) =>
			await service.commitCursorOnly({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
			});

		it('advances the cursor without creating an execution', async () => {
			const service = buildService();

			await commitCursorOnly(service);

			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				{},
			);
			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		it('propagates a failing advance', async () => {
			const service = buildService();
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(commitCursorOnly(service)).rejects.toBe(advanceError);
		});
	});
});
