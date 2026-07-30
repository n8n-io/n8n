/* eslint-disable @typescript-eslint/unbound-method */
import type { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
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
		workflowsConfigFlags: Partial<Pick<WorkflowsConfig, 'useWorkflowPublicationService'>> = {},
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
			mock<WorkflowsConfig>({
				useWorkflowPublicationService: true,
				...workflowsConfigFlags,
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
			{ flags: {}, workflowsConfigFlags: {}, expected: true },
			{ flags: { enabled: false }, workflowsConfigFlags: {}, expected: false },
			{ flags: { enabledForPollTriggers: false }, workflowsConfigFlags: {}, expected: false },
			{ flags: { durablePollCursors: false }, workflowsConfigFlags: {}, expected: false },
			{
				flags: {},
				workflowsConfigFlags: { useWorkflowPublicationService: false },
				expected: false,
			},
		])(
			'is $expected for $flags / $workflowsConfigFlags',
			({ flags, workflowsConfigFlags, expected }) => {
				expect(createService(flags, workflowsConfigFlags).enabled).toBe(expected);
			},
		);
	});

	describe('readCursor', () => {
		it('returns the stored cursor and version without touching static data', async () => {
			const workflow = createWorkflow({ lastItemId: 'from-static-data' });
			pollerStateRepository.findCursor.mockResolvedValue({
				cursor: { lastItemId: 'stored' },
				version: 3,
			});

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toEqual({ cursor: { lastItemId: 'stored' }, version: 3 });
			expect(pollerStateRepository.ensureCursor).not.toHaveBeenCalled();
		});

		it('seeds a first-time node from its static data', async () => {
			const workflow = createWorkflow({ lastTimeChecked: 1000 });
			pollerStateRepository.findCursor.mockResolvedValue(null);
			pollerStateRepository.ensureCursor.mockResolvedValue({
				cursor: { lastTimeChecked: 1000 },
				version: 0,
			});

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toEqual({ cursor: { lastTimeChecked: 1000 }, version: 0 });
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
			pollerStateRepository.ensureCursor.mockResolvedValue({ cursor: {}, version: 0 });

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toBeUndefined();
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
			pollerStateRepository.ensureCursor.mockResolvedValue({
				cursor: { lastItemId: 'seeded-elsewhere' },
				version: 0,
			});

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toEqual({ cursor: { lastItemId: 'seeded-elsewhere' }, version: 0 });
		});

		it('keeps reading as never polled on a later call, as long as nothing has actually advanced it', async () => {
			// The row already exists (e.g. created by a previous readCursor), but nothing
			// has staged a cursor since, so `findCursor` hits the same never-advanced row
			// `ensureCursor` would have created fresh.
			const workflow = createWorkflow();
			pollerStateRepository.findCursor.mockResolvedValue({ cursor: {}, version: 0 });

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toBeUndefined();
			expect(pollerStateRepository.ensureCursor).not.toHaveBeenCalled();
		});

		it('reads a real cursor once something has advanced it, even if the value is empty', async () => {
			// A node that staged `{}` on purpose (found nothing, but consumed part of a
			// window) is "has run and found nothing", not "never polled" — version > 0
			// is what tells the two apart once the cursor itself is indistinguishable.
			const workflow = createWorkflow();
			pollerStateRepository.findCursor.mockResolvedValue({ cursor: {}, version: 1 });

			const staged = await createService().readCursor(workflow, node);

			expect(staged).toEqual({ cursor: {}, version: 1 });
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

		it('commits the execution and conditions the cursor advance on the version it was read at', async () => {
			const executionId = await createService().commitPoll(createWorkflow(), node, runData, {
				cursor: { lastItemId: 'a' },
				version: 2,
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
				2,
				{ trx },
			);
		});

		it('carries the deduplication key through to the execution payload', async () => {
			await createService().commitPoll(
				createWorkflow(),
				node,
				{ ...runData, deduplicationKey: 'occurrence-7' },
				{ cursor: { lastItemId: 'a' }, version: 0 },
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
			await createService().commitPoll(createWorkflow(), node, runData, {
				cursor: { lastItemId: 'a' },
				version: 0,
			});

			expect(workflowStaticDataService.mergeNodeStaticData).toHaveBeenCalledWith(
				'workflow-1',
				'RSS Feed Trigger',
				{ lastItemId: 'a' },
			);
		});

		it("merges the cursor onto the node's own static data instead of replacing its entry outright", async () => {
			// A node that also writes non-cursor keys via getWorkflowStaticData('node')
			// in the same poll must not lose them to the mirror.
			const workflow = createWorkflow({ ownKey: 'kept', lastItemId: 'stale' });

			await createService().commitPoll(workflow, node, runData, {
				cursor: { lastItemId: 'a' },
				version: 0,
			});

			expect(workflowStaticDataService.mergeNodeStaticData).toHaveBeenCalledWith(
				'workflow-1',
				'RSS Feed Trigger',
				{ ownKey: 'kept', lastItemId: 'a' },
			);
		});

		it('reports a failed mirror and still returns the committed execution', async () => {
			const error = new Error('static data write failed');
			workflowStaticDataService.mergeNodeStaticData.mockRejectedValue(error);

			const executionId = await createService().commitPoll(createWorkflow(), node, runData, {
				cursor: { lastItemId: 'a' },
				version: 0,
			});

			expect(executionId).toBe('exec-1');
			expect(errorReporter.error).toHaveBeenCalledWith(error, {
				extra: { workflowId: 'workflow-1', nodeId: 'node-1' },
			});
		});
	});

	describe('commitEmptyPoll', () => {
		it('advances the cursor conditioned on its version and mirrors it without creating an execution', async () => {
			await createService().commitEmptyPoll(createWorkflow(), node, {
				cursor: { lastTimeChecked: 2000 },
				version: 5,
			});

			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'workflow-1',
				'node-1',
				{ lastTimeChecked: 2000 },
				5,
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
				createService().commitEmptyPoll(createWorkflow(), node, {
					cursor: { lastTimeChecked: 2000 },
					version: 0,
				}),
			).rejects.toThrow('no row to advance');
		});
	});
});
