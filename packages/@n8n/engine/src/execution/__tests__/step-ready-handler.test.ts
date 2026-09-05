import { describe, expect, it, vi } from 'vitest';

import type { ExternalDependencies, IStepExecutor } from '../../dependencies';
import { deriveLoops, type WorkflowGraph } from '../../graph';
import type { LifecycleEventPublisher, LifecycleEvent } from '../../lifecycle-events';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import {
	stepKeyId,
	type StepSlots,
	type StepStatus,
	type WaitDeclaration,
} from '../execution.types';
import { resolveInputReads, StepReadyHandler } from '../step-ready-handler';
import type { StepRecord, StepStore, StepSummary } from '../step-store';

/** Key for a `loadStepsByKeys` result at iteration 0, as the handler requests them. */
const at = (nodeId: string) => stepKeyId({ nodeId, iteration: 0 });

/** A predecessor row as `loadStepsByKeys` returns it, keyed at iteration 0. */
function stepRow(nodeId: string, status: StepStatus, outputs: StepSlots | null = null): StepRecord {
	return {
		id: `step-${nodeId}`,
		executionId: 'exec-1',
		nodeId,
		iteration: 0,
		status,
		outputs,
		wait: null,
		resume: null,
	};
}

/** trigger -> a -> b, so `a` has the trigger as its only predecessor. */
const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'T', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node', config: { some: 'config' } },
		{ id: 'b', name: 'B', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
		{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
	],
};

/** A publisher fake; tests that care assert on `publish`. */
function makeLifecycleEventPublisher(): LifecycleEventPublisher {
	return { publish: vi.fn(), stop: vi.fn() };
}

/** Handler with a throwaway publisher, for the tests that ignore it. */
function makeHandler(
	executionStore: ExecutionStore,
	stepStore: StepStore,
	queue: WorkQueue<OrchestrationMessage>,
	dependencies: ExternalDependencies,
	lifecycleEventPublisher: LifecycleEventPublisher = makeLifecycleEventPublisher(),
): StepReadyHandler {
	return new StepReadyHandler(
		executionStore,
		stepStore,
		queue,
		dependencies,
		lifecycleEventPublisher,
	);
}

function makeExecutionStore(overrides: Partial<ExecutionRecord> = {}): ExecutionStore {
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
	};
}

function makeStepStore(step: Partial<StepRecord> = {}, overrides: Partial<StepStore> = {}) {
	const record: StepRecord = {
		id: 'step-a',
		executionId: 'exec-1',
		nodeId: 'a',
		iteration: 0,
		status: 'running',
		outputs: null,
		wait: null,
		resume: null,
		...step,
	};
	return {
		createSteps: vi.fn(),
		loadStep: vi.fn().mockResolvedValue(record),
		claimStep: vi.fn().mockResolvedValue(record),
		completeStep: vi.fn().mockResolvedValue(true),
		failStep: vi.fn().mockResolvedValue(true),
		cancelQueuedSteps: vi.fn(),
		loadStepsByKeys: vi
			.fn()
			.mockResolvedValue({ [at('trigger')]: stepRow('trigger', 'completed', [{}]) }),
		loadStepSummariesByKeys: vi.fn().mockResolvedValue({}),
		loadLatestStepSummaries: vi.fn().mockResolvedValue({}),
		loadAllSteps: vi.fn().mockResolvedValue([]),
		countSettledSteps: vi.fn().mockResolvedValue(0),
		hasFailedSteps: vi.fn().mockResolvedValue(false),
		suspendStep: vi.fn().mockResolvedValue(true),
		resumeStep: vi.fn().mockResolvedValue(true),
		resumeDueSteps: vi.fn().mockResolvedValue([]),
		...overrides,
	} satisfies StepStore;
}

function makeQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeExecutor(result: unknown = { outputs: [[{ json: { ok: true } }]] }): IStepExecutor {
	return { execute: vi.fn().mockResolvedValue(result) };
}

const event = { type: 'step:ready', executionId: 'exec-1', stepId: 'step-a' } as const;

describe('StepReadyHandler', () => {
	it('claims the step, runs it through the executor, records its outputs and reports completion', async () => {
		const stepStore = makeStepStore(
			{},
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('trigger')]: stepRow('trigger', 'completed', [{ body: { hello: 'world' } }]),
				}),
			},
		);
		const queue = makeQueue();
		const executor = makeExecutor({ outputs: [[{ json: { ok: true } }]] });
		// a stale payload on the execution record must not be consulted: the
		// trigger's step row is the one source of its output
		const executionStore = makeExecutionStore({ triggerOutputs: [{ body: { stale: true } }] });
		const handler = makeHandler(executionStore, stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		// 'a' sits behind the trigger; its input slot 0 is the trigger's output slot 0
		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'trigger', iteration: 0 },
		]);
		expect(executor.execute).toHaveBeenCalledWith({
			node: { id: 'a', name: 'A', type: 'v1-node', config: { some: 'config' } },
			inputs: [{ body: { hello: 'world' } }],
			context: {
				executionId: 'exec-1',
				stepId: 'step-a',
				workflowId: 'wf-1',
				mode: 'production',
				iteration: 0,
			},
		});
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', [[{ json: { ok: true } }]]);
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('reads inputs from the predecessor step outputs when the predecessor is not the trigger', async () => {
		const executor = makeExecutor();
		// step 'b', whose only predecessor is 'a'
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				loadStepsByKeys: vi
					.fn()
					.mockResolvedValue({ [at('a')]: stepRow('a', 'completed', [[{ json: { from: 'a' } }]]) }),
			},
		);
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'a', iteration: 0 },
		]);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { from: 'a' } }]] }),
		);
	});

	it('gathers a fan-in: each input slot from its predecessor', async () => {
		// trigger fans out to a and b, which converge on m's two input slots
		const diamond: WorkflowGraph = {
			nodes: [...graph.nodes, { id: 'm', name: 'M', type: 'v1-node' }],
			edges: [
				{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'm', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'm', outputIndex: 0, inputIndex: 1 },
			],
		};
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('a')]: stepRow('a', 'completed', [[{ json: { from: 'a' } }]]),
					[at('b')]: stepRow('b', 'completed', [[{ json: { from: 'b' } }]]),
				}),
			},
		);
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ graph: diamond }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-m' });

		// one round trip for all predecessors
		expect(stepStore.loadStepsByKeys).toHaveBeenCalledTimes(1);
		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'a', iteration: 0 },
			{ nodeId: 'b', iteration: 0 },
		]);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { from: 'a' } }], [{ json: { from: 'b' } }]] }),
		);
	});

	it('leaves an input slot no edge feeds null', async () => {
		const gapped: WorkflowGraph = {
			nodes: [...graph.nodes, { id: 'm', name: 'M', type: 'v1-node' }],
			edges: [
				{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'm', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'm', outputIndex: 0, inputIndex: 2 },
			],
		};
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('a')]: stepRow('a', 'completed', [[{ json: { from: 'a' } }]]),
					[at('b')]: stepRow('b', 'completed', [[{ json: { from: 'b' } }]]),
				}),
			},
		);
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ graph: gapped }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				inputs: [[{ json: { from: 'a' } }], null, [{ json: { from: 'b' } }]],
			}),
		);
	});

	it('feeds two input slots from one predecessor wired to both', async () => {
		const doubled: WorkflowGraph = {
			nodes: [...graph.nodes, { id: 'm', name: 'M', type: 'v1-node' }],
			edges: [
				{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'm', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'm', outputIndex: 0, inputIndex: 1 },
			],
		};
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				loadStepsByKeys: vi
					.fn()
					.mockResolvedValue({ [at('a')]: stepRow('a', 'completed', [[{ json: { from: 'a' } }]]) }),
			},
		);
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ graph: doubled }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'a', iteration: 0 },
		]);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				inputs: [[{ json: { from: 'a' } }], [{ json: { from: 'a' } }]],
			}),
		);
	});

	it('records multi-slot outputs verbatim', async () => {
		// An If that routed everything to the taken branch: slot 0 has items,
		// slot 1 is dead. Recording is shape-agnostic; planning reads the
		// slots to decide which branches live.
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const executor = makeExecutor({ outputs: [[{ json: { taken: true } }], null] });
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', [
			[{ json: { taken: true } }],
			null,
		]);
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('completes a step that fires nothing despite having successors', async () => {
		// a dead output is a legal outcome now: the settlement handler skips the
		// successors instead of this step failing
		const stepStore = makeStepStore();
		const executor = makeExecutor({ outputs: [] });
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', []);
	});

	it('completes a terminal step that leaves its output slot unfilled', async () => {
		// nothing is connected to b's output, so declining to fire it means nothing
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				loadStepsByKeys: vi
					.fn()
					.mockResolvedValue({ [at('a')]: stepRow('a', 'completed', [[{ json: { from: 'a' } }]]) }),
			},
		);
		const executor = makeExecutor({ outputs: [null] });
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-b', [null]);
	});

	it('routes from the output slot the edge names', async () => {
		// b reads a's second output slot: exactly the If/Switch shape
		const routed: WorkflowGraph = {
			nodes: graph.nodes,
			edges: [graph.edges[0], { from: 'a', to: 'b', outputIndex: 1, inputIndex: 0 }],
		};
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('a')]: stepRow('a', 'completed', [[{ json: { slot: 0 } }], [{ json: { slot: 1 } }]]),
				}),
			},
		);
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ graph: routed }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { slot: 1 } }]] }),
		);
	});

	it('reads null from an input slot fed by a skipped predecessor', async () => {
		// m runs on b's live edge; its other input came from skipped c and reads
		// null — dead edges carry explicitly no data, not fabricated items
		const merged: WorkflowGraph = {
			nodes: [
				...graph.nodes,
				{ id: 'c', name: 'C', type: 'v1-node' },
				{ id: 'm', name: 'M', type: 'v1-node' },
			],
			edges: [
				...graph.edges,
				{ from: 'b', to: 'm', outputIndex: 0, inputIndex: 0 },
				{ from: 'c', to: 'm', outputIndex: 0, inputIndex: 1 },
			],
		};
		const stepStore = makeStepStore(
			{ id: 'step-m', nodeId: 'm' },
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('b')]: stepRow('b', 'completed', [[{ json: { from: 'b' } }]]),
					[at('c')]: stepRow('c', 'skipped'),
				}),
			},
		);
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ graph: merged }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { from: 'b' } }], null] }),
		);
	});

	it.each([
		{
			reason: 'the predecessor row is still unsettled',
			rows: () => ({ [at('trigger')]: stepRow('trigger', 'running') }),
		},
		{
			reason: 'the predecessor has no row at all',
			rows: () => ({}),
		},
	])('throws, running nothing, when $reason', async ({ rows }) => {
		// a step is planned only once every predecessor settled, so anything else
		// means the planner and the store disagree — running on a fabricated
		// empty input would mask that
		const stepStore = makeStepStore({}, { loadStepsByKeys: vi.fn().mockResolvedValue(rows()) });
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('not settled') as string,
		});

		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
	});

	it('is a no-op when the step cannot be claimed (duplicate delivery)', async () => {
		const stepStore = makeStepStore({}, { claimStep: vi.fn().mockResolvedValue(null) });
		const queue = makeQueue();
		const executor = makeExecutor();
		const executionStore = makeExecutionStore();
		const handler = makeHandler(executionStore, stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		// the claim comes first, so a duplicate touches nothing else
		expect(stepStore.loadStep).not.toHaveBeenCalled();
		expect(executionStore.loadExecution).not.toHaveBeenCalled();
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('claims the step but runs nothing when the execution is no longer running', async () => {
		// the claim already happened, so the step stays `running` for
		// reconciliation (CAT-2938) to resolve — nothing is recorded or announced
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore({ status: 'cancelled' }), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('does not report completion when the lifecycle event is not recorded', async () => {
		const stepStore = makeStepStore({}, { completeStep: vi.fn().mockResolvedValue(false) });
		const queue = makeQueue();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: makeExecutor(),
		});

		await handler.handle(event);

		expect(stepStore.completeStep).toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('claims the step but throws, recording nothing, when the event names an execution the step is not part of', async () => {
		const stepStore = makeStepStore({ executionId: 'exec-other' });
		const queue = makeQueue();
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await expect(handler.handle(event)).rejects.toThrow(
			'step step-a belongs to execution exec-other, but the event claims exec-1',
		);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('propagates a failure to record a completed step rather than failing the step', async () => {
		// the step ran; a write blip must not record it as if the node failed
		const stepStore = makeStepStore(
			{},
			{ completeStep: vi.fn().mockRejectedValue(new Error('connection reset')) },
		);
		const queue = makeQueue();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: makeExecutor(),
		});

		await expect(handler.handle(event)).rejects.toThrow('connection reset');

		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('records the error and reports completion when the executor throws', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const executor: IStepExecutor = {
			execute: vi.fn().mockRejectedValue(new TypeError('node blew up')),
		};
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'TypeError',
			message: 'node blew up',
			// the stack is what makes a failed step debuggable
			stack: expect.stringContaining('TypeError: node blew up') as string,
		});
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		// the orchestrator still has to hear about it
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	// A v1 node runs user code, which can reject with anything — a non-Error still
	// has to land as a recorded failure rather than escaping the handler.
	it('records a non-Error rejection as a failure', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const executor: IStepExecutor = { execute: vi.fn().mockRejectedValue('just a string') };
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'Error',
			message: 'just a string',
		});
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	/**
	 * Context validation runs only after the claim (the execution status has
	 * to be checked post-claim, and the context load comes with it), so the
	 * handler throws with the step left `running` for reconciliation
	 * (CAT-2938) or internal consistency checks (CAT-3930) to resolve.
	 */
	it.each([
		{
			reason: 'no executor is configured for its step type',
			stepId: 'step-a',
			steps: () => makeStepStore(),
			execution: () => makeExecutionStore(),
			deps: (): ExternalDependencies => ({}),
			expected: { name: 'UnimplementedError', message: 'v1-node' },
		},
		{
			reason: 'its node is absent from the execution graph',
			stepId: 'step-a',
			steps: () => makeStepStore({ nodeId: 'ghost' }),
			execution: () => makeExecutionStore(),
			deps: (executor: IStepExecutor): ExternalDependencies => ({ v1StepExecutor: executor }),
			expected: { name: 'UnexpectedError', message: 'ghost' },
		},
	])(
		'claims the step but throws, recording nothing, when $reason',
		async ({ stepId, steps, execution, deps, expected }) => {
			const stepStore = steps();
			const queue = makeQueue();
			const executor = makeExecutor();
			const handler = makeHandler(execution(), stepStore, queue, deps(executor));

			await expect(handler.handle({ ...event, stepId })).rejects.toMatchObject({
				name: expected.name,
				message: expect.stringContaining(expected.message) as string,
			});

			expect(stepStore.claimStep).toHaveBeenCalledWith(stepId);
			expect(executor.execute).not.toHaveBeenCalled();
			expect(stepStore.completeStep).not.toHaveBeenCalled();
			expect(stepStore.failStep).not.toHaveBeenCalled();
			expect(queue.publish).not.toHaveBeenCalled();
		},
	);

	/**
	 * Graph shapes ruled out by `validateExecutableGraph` are only detected after
	 * the claim, so the handler throws and leaves the step `running` — such a
	 * graph should never have been admitted, making this a bug, not a case to
	 * record. Reconciliation (CAT-2938) or internal consistency checks
	 * (CAT-3930) will resolve these.
	 */
	it.each([
		{
			reason: 'two edges feed the same input slot',
			stepId: 'step-b',
			steps: () => makeStepStore({ id: 'step-b', nodeId: 'b' }),
			execution: () =>
				makeExecutionStore({
					graph: {
						nodes: graph.nodes,
						// both a and the trigger feed b's slot 0
						edges: [...graph.edges, { from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 }],
					},
				}),
			deps: (executor: IStepExecutor): ExternalDependencies => ({ v1StepExecutor: executor }),
			expected: { name: 'UnexpectedError', message: 'input slot' },
		},
		{
			reason: 'its node has no predecessor in the graph',
			stepId: 'step-orphan',
			steps: () => makeStepStore({ id: 'step-orphan', nodeId: 'orphan' }),
			execution: () =>
				makeExecutionStore({
					graph: {
						nodes: [...graph.nodes, { id: 'orphan', name: 'Orphan', type: 'v1-node' }],
						edges: graph.edges,
					},
				}),
			deps: (executor: IStepExecutor): ExternalDependencies => ({ v1StepExecutor: executor }),
			expected: { name: 'UnexpectedError', message: 'no predecessor' },
		},
	])(
		'throws after claiming the step, recording nothing, when $reason',
		async ({ stepId, steps, execution, deps, expected }) => {
			const stepStore = steps();
			const queue = makeQueue();
			const executor = makeExecutor();
			const handler = makeHandler(execution(), stepStore, queue, deps(executor));

			await expect(handler.handle({ ...event, stepId })).rejects.toMatchObject({
				name: expected.name,
				message: expect.stringContaining(expected.message) as string,
			});

			expect(stepStore.claimStep).toHaveBeenCalledWith(stepId);
			expect(executor.execute).not.toHaveBeenCalled();
			expect(stepStore.completeStep).not.toHaveBeenCalled();
			expect(stepStore.failStep).not.toHaveBeenCalled();
			expect(queue.publish).not.toHaveBeenCalled();
		},
	);
});

describe('StepReadyHandler waits', () => {
	/** What the shim returns for a Wait node in time mode. */
	const timeWait: WaitDeclaration = {
		resumeAt: '2099-01-01T00:00:00.000Z',
		outputsAtDeadline: [[{ json: { passed: 'through' } }]],
		acceptsResumeRequest: false,
	};

	it('suspends the step and announces no settlement when the executor declares a wait', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: makeExecutor({ wait: timeWait }),
		});

		await handler.handle(event);

		expect(stepStore.suspendStep).toHaveBeenCalledWith('step-a', timeWait);
		// `waiting` is not settled: the step has no outcome yet, so nothing may
		// plan behind it and nothing may count it towards the execution's end.
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('suspends a wait that only a resume request ends', async () => {
		const openWait: WaitDeclaration = { acceptsResumeRequest: true };
		const stepStore = makeStepStore();
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: makeExecutor({ wait: openWait }),
		});

		await handler.handle(event);

		expect(stepStore.suspendStep).toHaveBeenCalledWith('step-a', openWait);
	});

	it('fails the step when the declaration can never resume', async () => {
		// No deadline and no resume request means nothing would ever end this
		// wait, so suspending would strand the execution. The declaration comes
		// across the executor seam, so this is the executor's bug — but the node
		// has already run, and a step that ran is recorded, not left running.
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: makeExecutor({ wait: { acceptsResumeRequest: false } }),
		});

		await handler.handle(event);

		expect(stepStore.suspendStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith(
			'step-a',
			expect.objectContaining({
				message: expect.stringContaining('declares a wait that can never resume') as string,
			}),
		);
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});
});

describe('StepReadyHandler resumes', () => {
	const timeWait: WaitDeclaration = {
		resumeAt: '2099-01-01T00:00:00.000Z',
		outputsAtDeadline: [[{ json: { passed: 'through' } }]],
		acceptsResumeRequest: false,
	};

	it('emits the captured outputs when a deadline resume dispatches the step', async () => {
		const stepStore = makeStepStore({
			status: 'running',
			wait: timeWait,
			resume: { kind: 'deadline' },
		});
		const queue = makeQueue();
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		// the node is never run again: the declaration already holds its output,
		// so there is nothing to feed it either
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.loadStepsByKeys).not.toHaveBeenCalled();
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', timeWait.outputsAtDeadline);
		expect(stepStore.suspendStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('runs the executor with the resume payload when a request resume dispatches the step', async () => {
		const openWait: WaitDeclaration = { acceptsResumeRequest: true };
		const stepStore = makeStepStore(
			{
				status: 'running',
				wait: openWait,
				resume: { kind: 'request', payload: { body: { approved: true } } },
			},
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[at('trigger')]: stepRow('trigger', 'completed', [{ body: { hello: 'world' } }]),
				}),
			},
		);
		const executor = makeExecutor({ outputs: [[{ json: { resumed: true } }]] });
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		// the payload rides along so the shim can run the node's resume path; the
		// step's inputs are gathered as on any other dispatch
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				inputs: [{ body: { hello: 'world' } }],
				resumeRequest: { payload: { body: { approved: true } } },
			}),
		);
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', [[{ json: { resumed: true } }]]);
	});

	it('fails the step when a deadline resume finds no captured outputs', async () => {
		// The declaration type pairs a deadline with its outputs, so only a write
		// from outside the type system reaches this — but the row is such a write.
		const stepStore = makeStepStore({
			status: 'running',
			wait: null,
			resume: { kind: 'deadline' },
		});
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: makeExecutor(),
		});

		await handler.handle(event);

		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith(
			'step-a',
			expect.objectContaining({
				message: expect.stringContaining('captured no outputs') as string,
			}),
		);
	});

	it('does not treat a first dispatch as a resume', async () => {
		const stepStore = makeStepStore();
		const executor = makeExecutor();
		const handler = makeHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(executor.execute).toHaveBeenCalledWith(
			expect.not.objectContaining({ resumeRequest: expect.anything() as unknown }),
		);
	});
});

describe('StepReadyHandler lifecycle events', () => {
	const stepFields = {
		executionId: 'exec-1',
		stepId: 'step-a',
		nodeId: 'a',
		nodeName: 'A',
		iteration: 0,
		at: expect.any(String) as string,
	};

	it('announces the start and the outcome of a step it ran', async () => {
		const lifecycleEventPublisher = makeLifecycleEventPublisher();
		const outputs = [[{ json: { ok: true } }]];
		const handler = makeHandler(
			makeExecutionStore(),
			makeStepStore(),
			makeQueue(),
			{ v1StepExecutor: makeExecutor({ outputs }) },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(lifecycleEventPublisher.publish).toHaveBeenCalledTimes(2);
		expect(lifecycleEventPublisher.publish).toHaveBeenNthCalledWith(1, {
			type: 'step:started',
			...stepFields,
		});
		// outputs ride along, so a consumer needs no read to render them
		expect(lifecycleEventPublisher.publish).toHaveBeenNthCalledWith(2, {
			type: 'step:completed',
			...stepFields,
			outputs,
		});
	});

	it('announces step:failed when the executor throws', async () => {
		const lifecycleEventPublisher = makeLifecycleEventPublisher();
		const handler = makeHandler(
			makeExecutionStore(),
			makeStepStore(),
			makeQueue(),
			{ v1StepExecutor: { execute: vi.fn().mockRejectedValue(new Error('boom')) } },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(lifecycleEventPublisher.publish).toHaveBeenNthCalledWith(2, {
			type: 'step:failed',
			...stepFields,
		});
	});

	it('announces the outcome before the settled event', async () => {
		// Announcing after the settled event could invert causal order.
		const order: string[] = [];
		const lifecycleEventPublisher: LifecycleEventPublisher = {
			publish: vi.fn((event: LifecycleEvent) => {
				order.push(event.type);
			}),
			stop: vi.fn(),
		};
		const queue: WorkQueue<OrchestrationMessage> = {
			publish: vi.fn(async (message: OrchestrationMessage) => {
				order.push(`queue:${message.type}`);
				await Promise.resolve();
			}),
			start: vi.fn(),
			stop: vi.fn(),
		};
		const handler = makeHandler(
			makeExecutionStore(),
			makeStepStore(),
			queue,
			{ v1StepExecutor: makeExecutor() },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(order).toEqual(['step:started', 'step:completed', 'queue:step:settled']);
	});

	it('announces nothing when the step cannot be claimed', async () => {
		const lifecycleEventPublisher = makeLifecycleEventPublisher();
		const handler = makeHandler(
			makeExecutionStore(),
			makeStepStore({}, { claimStep: vi.fn().mockResolvedValue(null) }),
			makeQueue(),
			{ v1StepExecutor: makeExecutor() },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(lifecycleEventPublisher.publish).not.toHaveBeenCalled();
	});

	it('announces no outcome it did not record', async () => {
		const lifecycleEventPublisher = makeLifecycleEventPublisher();
		const handler = makeHandler(
			makeExecutionStore(),
			makeStepStore({}, { completeStep: vi.fn().mockResolvedValue(false) }),
			makeQueue(),
			{ v1StepExecutor: makeExecutor() },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(lifecycleEventPublisher.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:started',
			...stepFields,
		});
	});

	it('announces nothing for a step its execution no longer wants', async () => {
		// The step never runs, so it never started as far as a consumer is concerned.
		const lifecycleEventPublisher = makeLifecycleEventPublisher();
		const handler = makeHandler(
			makeExecutionStore({ status: 'cancelled' }),
			makeStepStore(),
			makeQueue(),
			{ v1StepExecutor: makeExecutor() },
			lifecycleEventPublisher,
		);

		await handler.handle(event);

		expect(lifecycleEventPublisher.publish).not.toHaveBeenCalled();
	});
});

describe('StepReadyHandler over loop iterations', () => {
	/**
	 * ┌───────┐    ┌───┐ o0    ┌───┐
	 * │trigger├───►│   ├──────►│ d │
	 * └───────┘    │ B │       └───┘
	 *              │   │ o1    ┌───┐
	 *              │   ├──────►│ x │
	 *              └─▲─┘       └─┬─┘
	 *                └──(back)───┘
	 */
	const loopGraph: WorkflowGraph = {
		nodes: [
			{ id: 'trigger', name: 'T', type: 'trigger' },
			{ id: 'B', name: 'B', type: 'batch' },
			{ id: 'x', name: 'X', type: 'v1-node' },
			{ id: 'd', name: 'D', type: 'v1-node' },
		],
		edges: [
			{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 },
			{ from: 'B', to: 'x', outputIndex: 1, inputIndex: 0 },
			{ from: 'x', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			{ from: 'B', to: 'd', outputIndex: 0, inputIndex: 0 },
		],
	};

	/** A loop's latest row as the store returns it: filled slots, no payloads. */
	function tipAt(iteration: number, filledOutputSlots: boolean[]): StepSummary {
		return {
			id: `step-B-${iteration}`,
			nodeId: 'B',
			iteration,
			status: 'completed',
			filledOutputSlots,
		};
	}

	function rowAt(nodeId: string, iteration: number, outputs: StepRecord['outputs']): StepRecord {
		return {
			id: `step-${nodeId}-${iteration}`,
			executionId: 'exec-1',
			nodeId,
			iteration,
			status: 'completed',
			outputs,
			wait: null,
			resume: null,
		};
	}

	it('reads the body input from the batch row at the same iteration', async () => {
		const executor = makeExecutor();
		const stepStore = makeStepStore(
			{ id: 'step-x-2', nodeId: 'x', iteration: 2 },
			{
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[stepKeyId({ nodeId: 'B', iteration: 2 })]: rowAt('B', 2, [null, [{ json: { i: 2 } }]]),
				}),
			},
		);
		const handler = makeHandler(makeExecutionStore({ graph: loopGraph }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-x-2' });

		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'B', iteration: 2 },
		]);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { i: 2 } }]] }),
		);
	});

	it('reads the batch node from the entry edge at iteration 0 and the return edge after it', () => {
		const loops = deriveLoops(loopGraph);
		const intoB = loopGraph.edges.filter((edge) => edge.to === 'B');

		const readsAt = (iteration: number) =>
			resolveInputReads(
				intoB,
				loops,
				{ id: `step-B-${iteration}`, nodeId: 'B', iteration },
				new Map(),
			).map(({ edge, key }) => ({ from: edge.from, key }));

		expect(readsAt(0)).toEqual([{ from: 'trigger', key: { nodeId: 'trigger', iteration: 0 } }]);
		expect(readsAt(1)).toEqual([{ from: 'x', key: { nodeId: 'x', iteration: 0 } }]);
	});

	it('reads what follows the loop from the terminal row, whatever iteration that is', async () => {
		const executor = makeExecutor();
		const stepStore = makeStepStore(
			{ id: 'step-d-0', nodeId: 'd', iteration: 0 },
			{
				loadLatestStepSummaries: vi.fn().mockResolvedValue({ B: tipAt(4, [true, false]) }),
				loadStepsByKeys: vi.fn().mockResolvedValue({
					[stepKeyId({ nodeId: 'B', iteration: 4 })]: rowAt('B', 4, [
						[{ json: { done: true } }],
						null,
					]),
				}),
			},
		);
		const handler = makeHandler(makeExecutionStore({ graph: loopGraph }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-d-0' });

		expect(stepStore.loadStepsByKeys).toHaveBeenCalledWith('exec-1', [
			{ nodeId: 'B', iteration: 4 },
		]);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { done: true } }]] }),
		);
	});

	it('throws, running nothing, when the loop it reads across has not ended', async () => {
		const executor = makeExecutor();
		const stepStore = makeStepStore(
			{ id: 'step-d-0', nodeId: 'd', iteration: 0 },
			{ loadLatestStepSummaries: vi.fn().mockResolvedValue({ B: tipAt(4, [false, true]) }) },
		);
		const handler = makeHandler(makeExecutionStore({ graph: loopGraph }), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await expect(handler.handle({ ...event, stepId: 'step-d-0' })).rejects.toThrow(
			/across a loop that has not ended/,
		);
		expect(executor.execute).not.toHaveBeenCalled();
	});
});
