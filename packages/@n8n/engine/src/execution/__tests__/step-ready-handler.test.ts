import { describe, expect, it, vi } from 'vitest';

import type { ExternalDependencies, IStepExecutor } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import { StepReadyHandler } from '../step-ready-handler';
import type { StepRecord, StepStore } from '../step-store';

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

function makeStepStore(step: Partial<StepRecord> = {}, overrides: Partial<StepStore> = {}) {
	const record: StepRecord = {
		id: 'step-a',
		executionId: 'exec-1',
		nodeId: 'a',
		status: 'running',
		outputs: null,
		error: null,
		...step,
	};
	return {
		createSteps: vi.fn(),
		loadStep: vi.fn().mockResolvedValue(record),
		claimStep: vi.fn().mockResolvedValue(record),
		completeStep: vi.fn().mockResolvedValue(true),
		failStep: vi.fn().mockResolvedValue(true),
		cancelQueuedSteps: vi.fn(),
		loadStepOutputs: vi.fn().mockResolvedValue({ trigger: [{}] }),
		loadCompletedNodeIds: vi.fn().mockResolvedValue(new Set()),
		hasActiveSteps: vi.fn().mockResolvedValue(false),
		hasFailedSteps: vi.fn().mockResolvedValue(false),
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
				loadStepOutputs: vi.fn().mockResolvedValue({ trigger: [{ body: { hello: 'world' } }] }),
			},
		);
		const queue = makeQueue();
		const executor = makeExecutor({ outputs: [[{ json: { ok: true } }]] });
		// a stale payload on the execution record must not be consulted: the
		// trigger's step row is the one source of its output
		const executionStore = makeExecutionStore({ triggerPayload: { body: { stale: true } } });
		const handler = new StepReadyHandler(executionStore, stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		// 'a' sits behind the trigger; its input slot 0 is the trigger's output slot 0
		expect(stepStore.loadStepOutputs).toHaveBeenCalledWith('exec-1', ['trigger']);
		expect(executor.execute).toHaveBeenCalledWith({
			node: { id: 'a', name: 'A', type: 'v1-node', config: { some: 'config' } },
			inputs: [{ body: { hello: 'world' } }],
			context: {
				executionId: 'exec-1',
				stepId: 'step-a',
				workflowId: 'wf-1',
				mode: 'production',
			},
		});
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', [[{ json: { ok: true } }]]);
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:completed',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('reads inputs from the predecessor step outputs when the predecessor is not the trigger', async () => {
		const executor = makeExecutor();
		// step 'b', whose only predecessor is 'a'
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{ loadStepOutputs: vi.fn().mockResolvedValue({ a: [[{ json: { from: 'a' } }]] }) },
		);
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(stepStore.loadStepOutputs).toHaveBeenCalledWith('exec-1', ['a']);
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
				loadStepOutputs: vi.fn().mockResolvedValue({
					a: [[{ json: { from: 'a' } }]],
					b: [[{ json: { from: 'b' } }]],
				}),
			},
		);
		const executor = makeExecutor();
		const handler = new StepReadyHandler(
			makeExecutionStore({ graph: diamond }),
			stepStore,
			makeQueue(),
			{ v1StepExecutor: executor },
		);

		await handler.handle({ ...event, stepId: 'step-m' });

		// one round trip for all predecessors
		expect(stepStore.loadStepOutputs).toHaveBeenCalledTimes(1);
		expect(stepStore.loadStepOutputs).toHaveBeenCalledWith('exec-1', ['a', 'b']);
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
				loadStepOutputs: vi.fn().mockResolvedValue({
					a: [[{ json: { from: 'a' } }]],
					b: [[{ json: { from: 'b' } }]],
				}),
			},
		);
		const executor = makeExecutor();
		const handler = new StepReadyHandler(
			makeExecutionStore({ graph: gapped }),
			stepStore,
			makeQueue(),
			{ v1StepExecutor: executor },
		);

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
			{ loadStepOutputs: vi.fn().mockResolvedValue({ a: [[{ json: { from: 'a' } }]] }) },
		);
		const executor = makeExecutor();
		const handler = new StepReadyHandler(
			makeExecutionStore({ graph: doubled }),
			stepStore,
			makeQueue(),
			{ v1StepExecutor: executor },
		);

		await handler.handle({ ...event, stepId: 'step-m' });

		expect(stepStore.loadStepOutputs).toHaveBeenCalledWith('exec-1', ['a']);
		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				inputs: [[{ json: { from: 'a' } }], [{ json: { from: 'a' } }]],
			}),
		);
	});

	it('fails the step when the executor produces more than one output slot', async () => {
		// A single-wired If passes graph validation but still emits two slots —
		// this guard is where branch selection gets rejected until it exists.
		const stepStore = makeStepStore(
			{},
			{ loadStepOutputs: vi.fn().mockResolvedValue({ trigger: [{}] }) },
		);
		const queue = makeQueue();
		const executor = makeExecutor({ outputs: [[{ json: { taken: true } }], []] });
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'UnimplementedError',
			message: expect.stringContaining('output slot') as string,
			stack: expect.any(String) as string,
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:completed',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('fails the step when it leaves its connected output slot unfilled', async () => {
		// 'a' has a successor, so an empty slot 0 means a branch was not taken —
		// unrepresentable until settlement lands
		const stepStore = makeStepStore(
			{},
			{ loadStepOutputs: vi.fn().mockResolvedValue({ trigger: [{}] }) },
		);
		const executor = makeExecutor({ outputs: [] });
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'UnimplementedError',
			message: expect.stringContaining('did not fire output slot 0') as string,
			stack: expect.any(String) as string,
		});
	});

	it('completes a terminal step that leaves its output slot unfilled', async () => {
		// nothing is connected to b's output, so declining to fire it means nothing
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{ loadStepOutputs: vi.fn().mockResolvedValue({ a: [[{ json: { from: 'a' } }]] }) },
		);
		const executor = makeExecutor({ outputs: [null] });
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-b', [null]);
	});

	it('reads the slot the edge names from a predecessor row carrying more slots', async () => {
		// write-time guards keep rows single-slot today; the read side doesn't
		// re-enforce that, it just takes the edge's slot
		const stepStore = makeStepStore(
			{ id: 'step-b', nodeId: 'b' },
			{
				loadStepOutputs: vi
					.fn()
					.mockResolvedValue({ a: [[{ json: { slot: 0 } }], [{ json: { slot: 1 } }]] }),
			},
		);
		const executor = makeExecutor();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: [[{ json: { slot: 0 } }]] }),
		);
	});

	it('throws, running nothing, when the predecessor step has no completed outputs', async () => {
		// a step is planned only once every predecessor completed, so a null entry
		// means the planner and the store disagree — running on a fabricated empty
		// input would mask that
		const stepStore = makeStepStore(
			{},
			{ loadStepOutputs: vi.fn().mockResolvedValue({ trigger: null }) },
		);
		const executor = makeExecutor();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await expect(handler.handle(event)).rejects.toMatchObject({
			name: 'UnexpectedError',
			message: expect.stringContaining('not completed') as string,
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
		const handler = new StepReadyHandler(executionStore, stepStore, queue, {
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
		const handler = new StepReadyHandler(
			makeExecutionStore({ status: 'cancelled' }),
			stepStore,
			queue,
			{ v1StepExecutor: executor },
		);

		await handler.handle(event);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('does not report completion when the status update is not recorded', async () => {
		const stepStore = makeStepStore({}, { completeStep: vi.fn().mockResolvedValue(false) });
		const queue = makeQueue();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
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
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
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
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
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
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
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
			type: 'step:completed',
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
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'Error',
			message: 'just a string',
		});
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:completed',
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
			const handler = new StepReadyHandler(execution(), stepStore, queue, deps(executor));

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
			reason: "its edge leaves the predecessor's second output",
			stepId: 'step-b',
			steps: () => makeStepStore({ id: 'step-b', nodeId: 'b' }),
			execution: () =>
				makeExecutionStore({
					graph: {
						nodes: graph.nodes,
						edges: [
							graph.edges[0],
							// output slots beyond 0 are rejected at graph validation
							{ from: 'a', to: 'b', outputIndex: 1, inputIndex: 0 },
						],
					},
				}),
			deps: (executor: IStepExecutor): ExternalDependencies => ({ v1StepExecutor: executor }),
			expected: { name: 'UnexpectedError', message: 'output slot' },
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
			const handler = new StepReadyHandler(execution(), stepStore, queue, deps(executor));

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
