import { describe, expect, it, vi } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, StepMessage, WorkQueue } from '../../queue';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import type { StepStatus } from '../execution.types';
import { StepSettledHandler } from '../step-settled-handler';
import type { NewStepRecord, StepRecord, StepStore, StepSummary } from '../step-store';

/**
 * trigger → a → {b (out 0), c (out 1)} → m. So `a` fans out across two output
 * slots, `m` fans in behind both `b` and `c`, and `m` is terminal. Five
 * reachable nodes in total, which the finish tests count against.
 */
const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'T', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node' },
		{ id: 'b', name: 'B', type: 'v1-node' },
		{ id: 'c', name: 'C', type: 'v1-node' },
		{ id: 'm', name: 'M', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
		{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
		{ from: 'a', to: 'c', outputIndex: 1, inputIndex: 0 },
		{ from: 'b', to: 'm', outputIndex: 0, inputIndex: 0 },
		{ from: 'c', to: 'm', outputIndex: 0, inputIndex: 1 },
	],
};

function summary(
	nodeId: string,
	status: StepStatus,
	filledOutputSlots: boolean[] = [],
): StepSummary {
	return { id: `step-${nodeId}`, nodeId, status, filledOutputSlots };
}

/** Both of a's output slots fired, so both branches are live by default. */
const defaultSummaries = [
	summary('trigger', 'completed', [true]),
	summary('a', 'completed', [true, true]),
];

function makeExecutionStore(
	overrides: Partial<ExecutionRecord> = {},
	storeOverrides: Partial<ExecutionStore> = {},
): ExecutionStore {
	const execution: ExecutionRecord = {
		id: 'exec-1',
		workflowId: 'wf-1',
		status: 'running',
		mode: 'production',
		graph,
		triggerOutputs: null,
		...overrides,
	};
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn().mockResolvedValue(execution),
		transitionStatus: vi.fn().mockResolvedValue(true),
		finishExecution: vi.fn().mockResolvedValue(true),
		...storeOverrides,
	};
}

function makeStepStore(
	step: Partial<StepRecord> = {},
	overrides: Partial<StepStore> = {},
	summaries: StepSummary[] = defaultSummaries,
) {
	const record: StepRecord = {
		id: 'step-a',
		executionId: 'exec-1',
		nodeId: 'a',
		status: 'completed',
		outputs: null,
		error: null,
		...step,
	};
	const summariesByNodeId = Object.fromEntries(summaries.map((s) => [s.nodeId, s]));
	return {
		// ids derived from the node, so assertions can name the step they expect
		createSteps: vi.fn().mockImplementation(async (_: string, records: NewStepRecord[]) => {
			await Promise.resolve();
			return records.map(({ nodeId }) => ({ id: `step-${nodeId}`, nodeId }));
		}),
		loadStep: vi.fn().mockResolvedValue(record),
		claimStep: vi.fn(),
		completeStep: vi.fn(),
		failStep: vi.fn(),
		cancelQueuedSteps: vi.fn(),
		// like the store: only requested nodes that have rows appear
		loadStepSummaries: vi.fn().mockImplementation(async (_: string, nodeIds: string[]) => {
			await Promise.resolve();
			return Object.fromEntries(
				nodeIds.filter((id) => summariesByNodeId[id]).map((id) => [id, summariesByNodeId[id]]),
			);
		}),
		loadStepsByNodeIds: vi.fn().mockResolvedValue({}),
		// far from settled, so finish tests opt in explicitly
		countSettledSteps: vi.fn().mockResolvedValue(0),
		hasFailedSteps: vi.fn().mockResolvedValue(false),
		...overrides,
	} satisfies StepStore;
}

function makeStepQueue(): WorkQueue<StepMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeOrchestrationQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeHandler(
	stepStore: StepStore,
	{
		executionStore = makeExecutionStore(),
		stepQueue = makeStepQueue(),
		orchestrationQueue = makeOrchestrationQueue(),
	} = {},
) {
	return {
		handler: new StepSettledHandler(executionStore, stepStore, stepQueue, orchestrationQueue),
		executionStore,
		stepQueue,
		orchestrationQueue,
	};
}

const event = { type: 'step:settled', executionId: 'exec-1', stepId: 'step-a' } as const;

describe('StepSettledHandler', () => {
	it('plans every live successor in one batch and publishes step:ready for each', async () => {
		const stepStore = makeStepStore();
		const { handler, stepQueue, orchestrationQueue } = makeHandler(stepStore);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{ nodeId: 'b', status: 'queued' },
			{ nodeId: 'c', status: 'queued' },
		]);
		expect(stepQueue.publish).toHaveBeenCalledTimes(2);
		expect(stepQueue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-b',
		});
		expect(stepQueue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-c',
		});
		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});

	it("plans the trigger's successors like any other node's", async () => {
		// execution start only announces the trigger's settlement; the first
		// steps are planned here, through the same rules as the rest
		const stepStore = makeStepStore({ id: 'step-trigger', nodeId: 'trigger' }, {}, [
			summary('trigger', 'completed', [true]),
		]);
		const { handler, stepQueue } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-trigger' });

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{ nodeId: 'a', status: 'queued' },
		]);
		expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('fails the execution before planning when any step has failed', async () => {
		// b failed but settled(c) is handled first, so m must not be planned
		// off c's live edge
		const stepStore = makeStepStore(
			{ id: 'step-c', nodeId: 'c' },
			{ hasFailedSteps: vi.fn().mockResolvedValue(true) },
		);
		const { handler, executionStore, stepQueue, orchestrationQueue } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-c' });

		expect(executionStore.finishExecution).toHaveBeenCalledExactlyOnceWith('exec-1', 'failed');
		expect(stepStore.cancelQueuedSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.loadStepSummaries).not.toHaveBeenCalled();
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});

	it('loads the decision rows in one query: the successors and their predecessors', async () => {
		const stepStore = makeStepStore({ id: 'step-b', nodeId: 'b' }, {}, [
			...defaultSummaries,
			summary('b', 'completed', [true]),
		]);
		const { handler } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-b' });

		// b's only successor is m; m reads from both b and c
		expect(stepStore.loadStepSummaries).toHaveBeenCalledExactlyOnceWith('exec-1', ['m', 'b', 'c']);
	});

	it('skips a dead branch and announces its settlement', async () => {
		// a fired only output slot 0: b is live, c is dead. The skip is a
		// settlement, so it is announced on the orchestration queue — its own
		// handler decides the next hop (the cascade is the event loop).
		const stepStore = makeStepStore({}, {}, [
			summary('trigger', 'completed', [true]),
			summary('a', 'completed', [true, false]),
		]);
		const { handler, stepQueue, orchestrationQueue } = makeHandler(stepStore);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{ nodeId: 'b', status: 'queued' },
			{ nodeId: 'c', status: 'skipped' },
		]);
		expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-b',
		});
		expect(orchestrationQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-c',
		});
	});

	it("plans a skipped step's successors like a completed step's", async () => {
		// c was skipped; its settlement event arrives. m is now decidable: b's
		// edge is live, c's is dead — m runs on the live data.
		const stepStore = makeStepStore({ id: 'step-c', nodeId: 'c', status: 'skipped' }, {}, [
			summary('trigger', 'completed', [true]),
			summary('a', 'completed', [true, false]),
			summary('b', 'completed', [true]),
			summary('c', 'skipped'),
		]);
		const { handler, stepQueue } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-c' });

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{ nodeId: 'm', status: 'queued' },
		]);
		expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-m',
		});
	});

	it('announces only the rows the insert actually created', async () => {
		// Another planner won both rows: RETURNING is empty, so nothing is
		// announced here — the winner announces, and lost announcements are
		// reconciliation's job (CAT-2938).
		const stepStore = makeStepStore({}, { createSteps: vi.fn().mockResolvedValue([]) }, [
			summary('trigger', 'completed', [true]),
			summary('a', 'completed', [true, false]),
		]);
		const { handler, stepQueue, orchestrationQueue, executionStore } = makeHandler(stepStore);

		await handler.handle(event);

		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
		// nothing queued by us and the count says work remains → no finish
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	const notPlanned: Array<{
		reason: string;
		stepId: string;
		step: Partial<StepRecord>;
		summaries: StepSummary[];
	}> = [
		{
			reason: 'a successor still has an unsettled predecessor',
			stepId: 'step-b',
			step: { id: 'step-b', nodeId: 'b' },
			// m sits behind b and c; c is still running
			summaries: [...defaultSummaries, summary('b', 'completed', [true]), summary('c', 'running')],
		},
		{
			reason: "a successor's predecessor has no row at all",
			stepId: 'step-b',
			step: { id: 'step-b', nodeId: 'b' },
			summaries: [...defaultSummaries, summary('b', 'completed', [true])],
		},
		{
			reason: 'the settled node has no successors',
			stepId: 'step-m',
			step: { id: 'step-m', nodeId: 'm' },
			summaries: defaultSummaries,
		},
		{
			reason: 'every successor already has a row (duplicate delivery)',
			stepId: 'step-a',
			step: {},
			summaries: [...defaultSummaries, summary('b', 'queued'), summary('c', 'queued')],
		},
	];

	it.each(notPlanned)('plans nothing when $reason', async ({ stepId, step, summaries }) => {
		const stepStore = makeStepStore(step, {}, summaries);
		const { handler, stepQueue, orchestrationQueue } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId });

		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});

	it('rejects an event whose step belongs to another execution', async () => {
		const stepStore = makeStepStore({ executionId: 'exec-2' });
		const { handler, stepQueue, executionStore } = makeHandler(stepStore);

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('belongs to execution exec-2') as string,
		});

		// Node ids are workflow-scoped, so 'a' resolves against exec-1's graph too:
		// unguarded, a sibling execution's step would plan and announce real work here.
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('rejects an event whose step references a node absent from the graph', async () => {
		const stepStore = makeStepStore({ nodeId: 'ghost' });
		const { handler, stepQueue, executionStore } = makeHandler(stepStore);

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('absent from the execution graph') as string,
		});

		// Unguarded, an unknown node has no successors, so this would silently
		// finish the execution on a corrupted row.
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('finishes the execution once every reachable node has settled', async () => {
		// 'm' is terminal; with its row settled all five reachable nodes are done
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{ countSettledSteps: vi.fn().mockResolvedValue(5) },
		);
		const { handler, executionStore } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(stepStore.countSettledSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'completed');
	});

	it('finishes the execution as failed when any step failed', async () => {
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				countSettledSteps: vi.fn().mockResolvedValue(5),
				hasFailedSteps: vi.fn().mockResolvedValue(true),
			},
		);
		const { handler, executionStore } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'failed');
	});

	it('leaves the execution running while any reachable node is unsettled', async () => {
		// four of five settled: a dead-branch cascade or a running step remains
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{ countSettledSteps: vi.fn().mockResolvedValue(4) },
		);
		const { handler, executionStore } = makeHandler(stepStore);

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('fails the execution and cancels queued steps the moment a step fails', async () => {
		const stepStore = makeStepStore({ status: 'failed' });
		const { handler, stepQueue, executionStore } = makeHandler(stepStore);

		await handler.handle(event);

		expect(executionStore.finishExecution).toHaveBeenCalledExactlyOnceWith('exec-1', 'failed');
		expect(stepStore.cancelQueuedSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(stepStore.countSettledSteps).not.toHaveBeenCalled();
	});

	it('cancels queued steps again on a redelivered failure event', async () => {
		// finishExecution false = the execution was already marked failed
		const stepStore = makeStepStore({ status: 'failed' });
		const executionStore = makeExecutionStore(
			{},
			{ finishExecution: vi.fn().mockResolvedValue(false) },
		);
		const { handler } = makeHandler(stepStore, { executionStore });

		await handler.handle(event);

		expect(stepStore.cancelQueuedSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
	});

	it('plans nothing more once the execution is finished', async () => {
		const stepStore = makeStepStore();
		const executionStore = makeExecutionStore({ status: 'failed' });
		const { handler, stepQueue } = makeHandler(stepStore, { executionStore });

		await handler.handle(event);

		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('does not test for completion when it just queued work', async () => {
		const stepStore = makeStepStore();
		const { handler, executionStore } = makeHandler(stepStore);

		await handler.handle(event);

		// 'a' fanned out to b and c, so the execution is provably unfinished
		expect(stepStore.countSettledSteps).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});
});
