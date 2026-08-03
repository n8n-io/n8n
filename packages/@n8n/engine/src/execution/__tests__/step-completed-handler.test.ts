import { describe, expect, it, vi } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import type { StepMessage, WorkQueue } from '../../queue';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import type { SettledStepStatus } from '../execution.types';
import { StepCompletedHandler } from '../step-completed-handler';
import type { NewStepRecord, StepRecord, StepStore } from '../step-store';

/**
 * trigger → a → {b, c} → m. So `a` fans out (`b` off slot 0, `c` off slot 1),
 * `m` fans in behind both `b` and `c`, and `m` is terminal.
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

function makeExecutionStore(overrides: Partial<ExecutionRecord> = {}): ExecutionStore {
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
	};
}

/** What each node's step has settled to; a node absent here hasn't settled. */
type SettledSeed = Record<string, { status: SettledStepStatus; filledOutputSlots: number[] }>;

function makeStepStore(
	step: Partial<StepRecord> = {},
	{ settled = {}, overrides = {} }: { settled?: SettledSeed; overrides?: Partial<StepStore> } = {},
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
	const settledByNodeId = new Map(Object.entries(settled));
	return {
		// ids derived from the node, so assertions can name the step they expect.
		// A row written as skipped settles its node, so the next planning round
		// sees it — the cascade behaves as it would against the real store.
		createSteps: vi.fn().mockImplementation(async (records: NewStepRecord[]) => {
			await Promise.resolve();
			for (const { nodeId, status } of records) {
				if (status === 'skipped') {
					settledByNodeId.set(nodeId, { status: 'skipped', filledOutputSlots: [] });
				}
			}
			return records.map(({ nodeId }) => ({ id: `step-${nodeId}`, nodeId }));
		}),
		loadStep: vi.fn().mockResolvedValue(record),
		claimStep: vi.fn(),
		completeStep: vi.fn(),
		failStep: vi.fn(),
		loadStepOutputs: vi.fn(),
		loadSettledSteps: vi
			.fn()
			.mockImplementation(async (_executionId: string, nodeIds: string[]) => {
				await Promise.resolve();
				return nodeIds.flatMap((nodeId) => {
					const settledStep = settledByNodeId.get(nodeId);
					return settledStep ? [{ nodeId, ...settledStep }] : [];
				});
			}),
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
	it('plans every live successor in one batch and publishes step:ready for each', async () => {
		const stepStore = makeStepStore(
			{},
			{ settled: { a: { status: 'completed', filledOutputSlots: [0, 1] } } },
		);
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith([
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

	it("asks readiness in one query, for the successors' own predecessors", async () => {
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				settled: {
					a: { status: 'completed', filledOutputSlots: [0, 1] },
					b: { status: 'completed', filledOutputSlots: [0] },
					c: { status: 'completed', filledOutputSlots: [0] },
				},
			},
		);
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-b' });

		// b's only successor is m, which sits behind both b and c
		expect(stepStore.loadSettledSteps).toHaveBeenCalledExactlyOnceWith('exec-1', ['b', 'c']);
	});

	it('skips a successor whose only edge leaves a slot the step did not fill', async () => {
		// 'a' filled slot 0 but not slot 1, so 'c' is behind a branch not taken
		const stepStore = makeStepStore(
			{},
			{ settled: { a: { status: 'completed', filledOutputSlots: [0] } } },
		);
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith([
			{ executionId: 'exec-1', nodeId: 'b', status: 'queued' },
			{ executionId: 'exec-1', nodeId: 'c', status: 'skipped' },
		]);
		// m stays undecided: its other predecessor, b, was queued, not settled
		expect(queue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-b',
		});
	});

	it('runs a join on its one live edge once the dead branch has settled', async () => {
		// the second half of the diamond: c was skipped earlier, b completes now
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				settled: {
					a: { status: 'completed', filledOutputSlots: [0] },
					b: { status: 'completed', filledOutputSlots: [0] },
					c: { status: 'skipped', filledOutputSlots: [] },
				},
			},
		);
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(stepStore.createSteps).toHaveBeenCalledExactlyOnceWith([
			{ executionId: 'exec-1', nodeId: 'm', status: 'queued' },
		]);
		expect(queue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-m',
		});
	});

	it('cascades skips to the end and completes the execution when nothing ran', async () => {
		// 'a' completed but filled nothing, so its whole downstream is dead
		const stepStore = makeStepStore(
			{},
			{ settled: { a: { status: 'completed', filledOutputSlots: [] } } },
		);
		const queue = makeQueue();
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await handler.handle(event);

		// round one skips the fan-out, round two the join behind it
		expect(stepStore.createSteps).toHaveBeenNthCalledWith(1, [
			{ executionId: 'exec-1', nodeId: 'b', status: 'skipped' },
			{ executionId: 'exec-1', nodeId: 'c', status: 'skipped' },
		]);
		expect(stepStore.createSteps).toHaveBeenNthCalledWith(2, [
			{ executionId: 'exec-1', nodeId: 'm', status: 'skipped' },
		]);
		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'completed');
	});

	it('skips the successors of a failed step and fails the execution', async () => {
		const stepStore = makeStepStore(
			{ status: 'failed' },
			{
				settled: { a: { status: 'failed', filledOutputSlots: [] } },
				overrides: { hasFailedSteps: vi.fn().mockResolvedValue(true) },
			},
		);
		const queue = makeQueue();
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, queue);

		await handler.handle(event);

		expect(stepStore.createSteps).toHaveBeenNthCalledWith(1, [
			{ executionId: 'exec-1', nodeId: 'b', status: 'skipped' },
			{ executionId: 'exec-1', nodeId: 'c', status: 'skipped' },
		]);
		expect(stepStore.createSteps).toHaveBeenNthCalledWith(2, [
			{ executionId: 'exec-1', nodeId: 'm', status: 'skipped' },
		]);
		expect(queue.publish).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'failed');
	});

	const notPlanned: Array<{
		reason: string;
		stepId: string;
		step: Partial<StepRecord>;
		settled: SettledSeed;
	}> = [
		{
			reason: 'a successor still has an unsettled predecessor',
			stepId: 'step-b',
			step: { id: 'step-b', nodeId: 'b' },
			// m sits behind b and c; c hasn't settled
			settled: {
				a: { status: 'completed', filledOutputSlots: [0, 1] },
				b: { status: 'completed', filledOutputSlots: [0] },
			},
		},
		{
			reason: 'the completed node has no successors',
			stepId: 'step-m',
			step: { id: 'step-m', nodeId: 'm' },
			settled: { m: { status: 'completed', filledOutputSlots: [0] } },
		},
	];

	it.each(notPlanned)('plans nothing when $reason', async ({ stepId, step, settled }) => {
		const stepStore = makeStepStore(step, { settled });
		const queue = makeQueue();
		const handler = new StepCompletedHandler(makeExecutionStore(), stepStore, queue);

		await handler.handle({ ...event, stepId });

		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('finishes the execution once the last step is done', async () => {
		// 'm' is terminal, and nothing else is left running
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{ settled: { m: { status: 'completed', filledOutputSlots: [0] } } },
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'completed');
	});

	it('finishes the execution as failed when any step failed', async () => {
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				settled: { m: { status: 'completed', filledOutputSlots: [0] } },
				overrides: { hasFailedSteps: vi.fn().mockResolvedValue(true) },
			},
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executionStore.finishExecution).toHaveBeenCalledWith('exec-1', 'failed');
	});

	it('leaves the execution running while another step is still outstanding', async () => {
		// 'b' failed, its downstream skips are held up by c — but c is still going
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b', status: 'failed' },
			{
				settled: {
					a: { status: 'completed', filledOutputSlots: [0, 1] },
					b: { status: 'failed', filledOutputSlots: [] },
				},
				overrides: { hasActiveSteps: vi.fn().mockResolvedValue(true) },
			},
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});

	it('does not test for completion when it just queued work', async () => {
		const stepStore = makeStepStore(
			{},
			{ settled: { a: { status: 'completed', filledOutputSlots: [0, 1] } } },
		);
		const executionStore = makeExecutionStore();
		const handler = new StepCompletedHandler(executionStore, stepStore, makeQueue());

		await handler.handle(event);

		// 'a' fanned out to b and c, so the execution is provably unfinished
		expect(stepStore.hasActiveSteps).not.toHaveBeenCalled();
		expect(executionStore.finishExecution).not.toHaveBeenCalled();
	});
});
