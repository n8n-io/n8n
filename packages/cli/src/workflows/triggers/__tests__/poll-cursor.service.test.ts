import type { Logger } from '@n8n/backend-common';
import type { PollerConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	OperationContext,
	PollerStateRepository,
	TransactionRunner,
} from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

describe('PollCursorService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();

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
			workflowStaticDataService,
			mock<PollerConfig>({ durableCursorsEnabled }),
			logger,
			errorReporter,
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
		vi.clearAllMocks();
	});

	describe('enabled', () => {
		it('reports the configured flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
		});
	});

	describe('readCursor', () => {
		it('seeds the cursor from the static-data blob when the node has no row', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'from-static-data' });

			const cursor = await service.readCursor('wf-1', 'node-1', {
				lastItemId: 'from-static-data',
			});

			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'from-static-data' },
				expect.anything(),
			);
			expect(cursor).toEqual({ lastItemId: 'from-static-data' });
		});

		it('returns the stored cursor rather than the seed when a row exists', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'from-db' });

			const cursor = await service.readCursor('wf-1', 'node-1', {
				lastItemId: 'from-static-data',
			});

			expect(cursor).toEqual({ lastItemId: 'from-db' });
		});

		it('returns null when the resulting cursor is empty', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({});

			await expect(service.readCursor('wf-1', 'node-1', {})).resolves.toBeNull();
		});
	});

	describe('commitWithExecution', () => {
		it('advances the cursor and creates the execution in one transaction', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const executionId = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(executionId).toBe('exec-1');
			expect(txRunner.run).toHaveBeenCalledTimes(1);

			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(executionPersistence.create).toHaveBeenCalledWith(createPayload, ctx);
		});

		it('does not create the execution when the cursor advance fails', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
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

		it('propagates a failing execution insert so the cursor advance rolls back with it', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			const insertError = new Error('insert failed');
			executionPersistence.create.mockRejectedValue(insertError);

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toBe(insertError);
		});
	});

	describe('commitCursorOnly', () => {
		it('advances the cursor in one transaction without creating an execution', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });

			await service.commitCursorOnly('wf-1', 'node-1', { lastItemId: 'b' });

			expect(txRunner.run).toHaveBeenCalledTimes(1);
			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		it('propagates a failing advance', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(service.commitCursorOnly('wf-1', 'node-1', { lastItemId: 'b' })).rejects.toBe(
				advanceError,
			);
		});
	});

	describe('mirrorToStaticData', () => {
		it("writes the cursor under the node's static-data key, keeping the other keys", async () => {
			const service = buildService();
			workflowStaticDataService.getStaticDataById.mockResolvedValue({
				'node:Other Poll Node': { lastItemId: 'x' },
			});

			await service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' });

			expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith('wf-1', {
				'node:Other Poll Node': { lastItemId: 'x' },
				'node:Poll Node': { lastItemId: 'b' },
			});
		});

		it('resolves and reports rather than throwing when the static-data write fails', async () => {
			const service = buildService();
			workflowStaticDataService.getStaticDataById.mockResolvedValue({});
			const writeError = new Error('static data write failed');
			workflowStaticDataService.saveStaticDataById.mockRejectedValue(writeError);

			await expect(
				service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' }),
			).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledWith(writeError, expect.anything());
			expect(logger.error).toHaveBeenCalled();
		});

		it('resolves and reports rather than throwing when the static-data read fails', async () => {
			const service = buildService();
			const readError = new Error('static data read failed');
			workflowStaticDataService.getStaticDataById.mockRejectedValue(readError);

			await expect(
				service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' }),
			).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledWith(readError, expect.anything());
		});
	});
});
