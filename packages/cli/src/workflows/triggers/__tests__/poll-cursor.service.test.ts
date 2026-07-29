/* eslint-disable @typescript-eslint/unbound-method */
import type { SchedulerConfig } from '@n8n/config';
import type { OperationContext, PollerStateRepository, TransactionRunner } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { INode, IWorkflowExecutionDataProcess, Workflow } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { PollCursorService } from '../poll-cursor.service';

describe('PollCursorService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const transactionRunner = mock<TransactionRunner>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const errorReporter = mock<ErrorReporter>();

	const node = mock<INode>({ id: 'node-1', name: 'RSS Feed Trigger' });

	/** A shared handle, so asserting both writes received it confirms they ran in one transaction. */
	const trx = mock<OperationContext['trx']>();

	const createService = (
		flags: Partial<
			Pick<SchedulerConfig, 'enabled' | 'enabledForPollTriggers' | 'durablePollCursors'>
		> = {},
	) =>
		new PollCursorService(
			pollerStateRepository,
			executionPersistence,
			transactionRunner,
			workflowStaticDataService,
			mock<SchedulerConfig>({
				enabled: true,
				enabledForPollTriggers: true,
				durablePollCursors: true,
				...flags,
			}),
			errorReporter,
		);

	const createWorkflow = (staticData: object = {}) =>
		mock<Workflow>({ id: 'workflow-1', getStaticData: vi.fn().mockReturnValue(staticData) });

	beforeEach(() => {
		vi.clearAllMocks();
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn({ trx }));
		executionPersistence.create.mockResolvedValue('exec-1');
	});

	describe('enabled', () => {
		it.each([
			{ flags: {}, expected: true },
			{ flags: { enabled: false }, expected: false },
			{ flags: { enabledForPollTriggers: false }, expected: false },
			{ flags: { durablePollCursors: false }, expected: false },
		])('is $expected for $flags', ({ flags, expected }) => {
			expect(createService(flags).enabled).toBe(expected);
		});
	});

	describe('readCursor', () => {
		it('returns the stored cursor without touching static data', async () => {
			const workflow = createWorkflow({ lastItemId: 'from-static-data' });
			pollerStateRepository.findCursor.mockResolvedValue({ lastItemId: 'stored' });

			const cursor = await createService().readCursor(workflow, node);

			expect(cursor).toEqual({ lastItemId: 'stored' });
			expect(pollerStateRepository.ensureCursor).not.toHaveBeenCalled();
		});

		it('seeds a first-time node from its static data', async () => {
			const workflow = createWorkflow({ lastTimeChecked: 1000 });
			pollerStateRepository.findCursor.mockResolvedValue(null);
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastTimeChecked: 1000 });

			const cursor = await createService().readCursor(workflow, node);

			expect(cursor).toEqual({ lastTimeChecked: 1000 });
			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'workflow-1',
				'node-1',
				{ lastTimeChecked: 1000 },
				{},
			);
		});

		it('reads as never polled when there is nothing to seed from, but still creates the row', async () => {
			const workflow = createWorkflow();
			pollerStateRepository.findCursor.mockResolvedValue(null);
			pollerStateRepository.ensureCursor.mockResolvedValue({});

			const cursor = await createService().readCursor(workflow, node);

			expect(cursor).toBeUndefined();
			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'workflow-1',
				'node-1',
				{},
				{},
			);
		});

		it('yields to a cursor another process seeded first', async () => {
			const workflow = createWorkflow();
			pollerStateRepository.findCursor.mockResolvedValue(null);
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'seeded-elsewhere' });

			const cursor = await createService().readCursor(workflow, node);

			expect(cursor).toEqual({ lastItemId: 'seeded-elsewhere' });
		});
	});

	describe('commitPoll', () => {
		const runData = mock<IWorkflowExecutionDataProcess>({
			executionData: createEmptyRunExecutionData(),
			executionMode: 'trigger',
			workflowData: mock({ id: 'workflow-1' }),
			retryOf: undefined,
			tracingContext: undefined,
			deduplicationKey: undefined,
		});

		it('commits the execution and the cursor advance in one transaction', async () => {
			const executionId = await createService().commitPoll(createWorkflow(), node, runData, {
				lastItemId: 'a',
			});

			expect(executionId).toBe('exec-1');
			expect(executionPersistence.create).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'new', workflowId: 'workflow-1', finished: false }),
				{ trx },
			);
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'workflow-1',
				'node-1',
				{ lastItemId: 'a' },
				{ trx },
			);
		});

		it('carries the deduplication key through to the execution payload', async () => {
			await createService().commitPoll(
				createWorkflow(),
				node,
				{ ...runData, deduplicationKey: 'occurrence-7' },
				{ lastItemId: 'a' },
			);

			expect(executionPersistence.create).toHaveBeenCalledWith(
				expect.objectContaining({ deduplicationKey: 'occurrence-7' }),
				{ trx },
			);
		});

		it('commits the execution alone when the poll staged no cursor', async () => {
			await createService().commitPoll(createWorkflow(), node, runData, undefined);

			expect(executionPersistence.create).toHaveBeenCalledTimes(1);
			expect(pollerStateRepository.advanceCursor).not.toHaveBeenCalled();
			expect(workflowStaticDataService.mergeNodeStaticData).not.toHaveBeenCalled();
		});

		it('mirrors the committed cursor to static data', async () => {
			await createService().commitPoll(createWorkflow(), node, runData, { lastItemId: 'a' });

			expect(workflowStaticDataService.mergeNodeStaticData).toHaveBeenCalledWith(
				'workflow-1',
				'RSS Feed Trigger',
				{ lastItemId: 'a' },
			);
		});

		it('reports a failed mirror and still returns the committed execution', async () => {
			const error = new Error('static data write failed');
			workflowStaticDataService.mergeNodeStaticData.mockRejectedValue(error);

			const executionId = await createService().commitPoll(createWorkflow(), node, runData, {
				lastItemId: 'a',
			});

			expect(executionId).toBe('exec-1');
			expect(errorReporter.error).toHaveBeenCalledWith(error, {
				extra: { workflowId: 'workflow-1', nodeId: 'node-1' },
			});
		});
	});

	describe('commitEmptyPoll', () => {
		it('advances the cursor and mirrors it without creating an execution', async () => {
			await createService().commitEmptyPoll(createWorkflow(), node, { lastTimeChecked: 2000 });

			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'workflow-1',
				'node-1',
				{ lastTimeChecked: 2000 },
				{},
			);
			expect(workflowStaticDataService.mergeNodeStaticData).toHaveBeenCalledWith(
				'workflow-1',
				'RSS Feed Trigger',
				{ lastTimeChecked: 2000 },
			);
			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		it('propagates a failed cursor advance', async () => {
			pollerStateRepository.advanceCursor.mockRejectedValue(new Error('no row to advance'));

			await expect(
				createService().commitEmptyPoll(createWorkflow(), node, { lastTimeChecked: 2000 }),
			).rejects.toThrow('no row to advance');
		});
	});
});
