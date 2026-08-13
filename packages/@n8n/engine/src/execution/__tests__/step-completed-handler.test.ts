import { describe, expect, it, vi } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import type { StepMessage, WorkQueue } from '../../queue';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import { StepCompletedHandler } from '../step-completed-handler';
import type { NewStepRecord, StepRecord, StepStore } from '../step-store';

/**
 * trigger → a → {b, c} → m. So `a` fans out, `m` fans in behind both `b` and
 * `c`, and `m` is terminal.
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
		triggerPayload: null,
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

function makeStepStore(step: Partial<StepRecord> = {}, overrides: Partial<StepStore> = {}) {
	const record: StepRecord = {
		id: 'step-a',
		executionId: 'exec-1',
		nodeId: 'a',
		status: 'completed',
		outputs: null,
		error: null,
		...step,
	};
	return {
		// ids derived from the node, so assertions can name the step they expect
		createSteps: vi.fn().mockImplementation(async (records: NewStepRecord[]) => {
			await Promise.resolve();
			return records.map(({ nodeId }) => ({ id: `step-${nodeId}`, nodeId }));
		}),
		loadStep: vi.fn().mockResolvedValue(record),
		claimStep: vi.fn(),
		completeStep: vi.fn(),
		failStep: vi.fn(),
		cancelQueuedSteps: vi.fn(),
		loadStepOutputs: vi.fn(),
		// every node completed, so a case has to opt out to be unready
		loadCompletedNodeIds: vi.fn().mockResolvedValue(new Set(graph.nodes.map(({ id }) => id))),
		hasActiveSteps: vi.fn().mockResolvedValue(false),
		hasFailedSteps: vi.fn().mockResolvedValue(false),
		...overrides,
	} satisfies StepStore;
}

function makeQueue(): WorkQueue<StepMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

const event = { type: 'step:completed', executionId: 'exec-1', stepId: 'step-a' } as const;

describe('StepCompletedHandler', () => {
	it('plans every ready successor in one batch and publishes step:ready for each', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenCalledWith([
			{ executionId: 'exec-1', nodeId: 'b', status: 'queued' },
			{ executionId: 'exec-1', nodeId: 'c', status: 'queued' },
		]);
		expect(queue.publish).toHaveBeenCalledTimes(2);
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-b',
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-c',
		});
	});

	it("plans the trigger's successors like any other node's", async () => {
		// execution start only announces the trigger's completion; the first
		// steps are planned here, through the same readiness rule as the rest
		const stepStore = makeStepStore({ id: 'step-trigger', nodeId: 'trigger' });
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle({ ...event, stepId: 'step-trigger' });

		expect(stepStore.createSteps).toHaveBeenCalledWith([
			{ executionId: 'exec-1', nodeId: 'a', status: 'queued' },
		]);
		expect(queue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it("asks readiness in one query, for the successors' other predecessors", async () => {
		const stepStore = makeStepStore({ id: 'step-b', nodeId: 'b' });
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-b' });

		// b's only successor is m, which sits behind both b and c — but b just
		// completed, so only c is in question
		expect(stepStore.loadCompletedNodeIds).toHaveBeenCalledExactlyOnceWith('exec-1', ['c']);
	});

	it('skips the readiness query when the completed node is every predecessor', async () => {
		// a is the sole predecessor of both b and c, and a just completed
		const stepStore = makeStepStore();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, makeQueue());

		await handler.handle(event);

		expect(stepStore.loadCompletedNodeIds).not.toHaveBeenCalled();
		expect(stepStore.createSteps).toHaveBeenCalledWith([
			{ executionId: 'exec-1', nodeId: 'b', status: 'queued' },
			{ executionId: 'exec-1', nodeId: 'c', status: 'queued' },
		]);
	});

	it('rejects an event whose step belongs to another execution', async () => {
		const stepStore = makeStepStore({ executionId: 'exec-2' });
		const executionStore = makeExecutionStore();
		const queue = makeQueue();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('belongs to execution exec-2') as string,
		});

		// Node ids are workflow-scoped, so 'a' resolves against exec-1's graph too:
		// unguarded, a sibling execution's step would plan and announce real work here.
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('rejects an event whose step references a node absent from the graph', async () => {
		const stepStore = makeStepStore({ nodeId: 'ghost' });
		const executionStore = makeExecutionStore();
		const queue = makeQueue();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('absent from the execution graph') as string,
		});

		// Unguarded, an unknown node has no successors, so this would silently
		// finish the execution on a corrupted row.
		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	const notPlanned: Array<{
		reason: string;
		stepId: string;
		step: Partial<StepRecord>;
		overrides: Partial<StepStore>;
	}> = [
		{
			reason: 'a successor still has an incomplete predecessor',
			stepId: 'step-b',
			step: { id: 'step-b', nodeId: 'b' },
			// m sits behind b and c; c hasn't completed
			overrides: { loadCompletedNodeIds: vi.fn().mockResolvedValue(new Set()) },
		},
		{
			reason: 'the completed node has no successors',
			stepId: 'step-m',
			step: { id: 'step-m', nodeId: 'm' },
			overrides: {},
		},
	];

	it.each(notPlanned)('plans nothing when $reason', async ({ stepId, step, overrides }) => {
		const stepStore = makeStepStore(step, overrides);
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle({ ...event, stepId });

		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('re-announces nothing and finishes nothing on duplicate delivery', async () => {
		// Redelivered completion for 'a': its successors are already planned, so
		// the insert's RETURNING is empty, and they're still active, so the
		// execution must not be finished early.
		const stepStore = makeStepStore(
			{},
			{
				createSteps: vi.fn().mockResolvedValue([]),
				hasActiveSteps: vi.fn().mockResolvedValue(true),
			},
		);
		const executionStore = makeExecutionStore();
		const queue = makeQueue();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await handler.handle(event);

		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('finishes the execution once the last step is done', async () => {
		// 'm' is terminal, and nothing else is left running
		const stepStore = makeStepStore({ id: 'step-m', nodeId: 'm' });
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'completed');
	});

	it('finishes the execution as failed when any step failed', async () => {
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{ hasFailedSteps: vi.fn().mockResolvedValue(true) },
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'failed');
	});

	it('leaves the execution running while another step is still outstanding', async () => {
		// 'b' completed but 'm' still waits on 'c', which is still going
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				loadCompletedNodeIds: vi.fn().mockResolvedValue(new Set()),
				hasActiveSteps: vi.fn().mockResolvedValue(true),
			},
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('fails the execution and cancels queued steps the moment a step fails', async () => {
		const stepStore = makeStepStore({ status: 'failed' });
		const executionStore = makeExecutionStore();
		const queue = makeQueue();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await handler.handle(event);

		expect(executionStore.finishExecution).toHaveBeenCalledExactlyOnceWith('exec-1', 'failed');
		expect(stepStore.cancelQueuedSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
		expect(stepStore.hasActiveSteps).not.toHaveBeenCalled();
		expect(stepStore.hasFailedSteps).not.toHaveBeenCalled();
	});

	it('cancels queued steps again on a redelivered failure event', async () => {
		// finishExecution false = the execution was already marked failed
		const stepStore = makeStepStore({ status: 'failed' });
		const executionStore = makeExecutionStore(
			{},
			{ finishExecution: vi.fn().mockResolvedValue(false) },
		);
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle(event);

		expect(stepStore.cancelQueuedSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
	});

	it('plans nothing more once the execution is finished', async () => {
		const stepStore = makeStepStore();
		const executionStore = makeExecutionStore({ status: 'failed' });
		const queue = makeQueue();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await handler.handle(event);

		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('does not test for completion when it just queued work', async () => {
		const stepStore = makeStepStore();
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle(event);

		// 'a' fanned out to b and c, so the execution is provably unfinished
		expect(stepStore.hasActiveSteps).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});
});
