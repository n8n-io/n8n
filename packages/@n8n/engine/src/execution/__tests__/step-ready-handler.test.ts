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
		claimStep: vi.fn().mockResolvedValue(true),
		completeStep: vi.fn().mockResolvedValue(true),
		failStep: vi.fn().mockResolvedValue(true),
		loadStepOutputs: vi.fn().mockResolvedValue({}),
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
	it('runs the step through the executor, records its outputs and reports completion', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const executor = makeExecutor({ outputs: [[{ json: { ok: true } }]] });
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.claimStep).toHaveBeenCalledWith('step-a');
		expect(stepStore.completeStep).toHaveBeenCalledWith('step-a', [[{ json: { ok: true } }]]);
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:completed',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('hands the executor the graph node and a context describing the execution', async () => {
		const executor = makeExecutor();
		const handler = new StepReadyHandler(makeExecutionStore(), makeStepStore(), makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(executor.execute).toHaveBeenCalledWith({
			node: { id: 'a', name: 'A', type: 'v1-node', config: { some: 'config' } },
			inputs: null,
			context: {
				executionId: 'exec-1',
				stepId: 'step-a',
				workflowId: 'wf-1',
				mode: 'production',
			},
		});
	});

	it('passes the trigger payload as inputs when the predecessor is the trigger', async () => {
		const executor = makeExecutor();
		const executionStore = makeExecutionStore({ triggerPayload: { body: { hello: 'world' } } });
		const handler = new StepReadyHandler(executionStore, makeStepStore(), makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(executor.execute).toHaveBeenCalledWith(
			expect.objectContaining({ inputs: { body: { hello: 'world' } } }),
		);
	});

	it('passes the predecessor step outputs as inputs for a non-trigger predecessor', async () => {
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

	it('is a no-op when the step cannot be claimed (duplicate delivery)', async () => {
		const stepStore = makeStepStore({}, { claimStep: vi.fn().mockResolvedValue(false) });
		const queue = makeQueue();
		const executor = makeExecutor();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.loadStep).not.toHaveBeenCalled();
		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.completeStep).not.toHaveBeenCalled();
		expect(stepStore.failStep).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('does not report completion when the step was taken over while it ran', async () => {
		const stepStore = makeStepStore({}, { completeStep: vi.fn().mockResolvedValue(false) });
		const queue = makeQueue();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: makeExecutor(),
		});

		await handler.handle(event);

		expect(stepStore.completeStep).toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('does not report completion when the failure could not be recorded', async () => {
		const stepStore = makeStepStore({}, { failStep: vi.fn().mockResolvedValue(false) });
		const queue = makeQueue();
		const executor: IStepExecutor = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(stepStore.failStep).toHaveBeenCalled();
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

	it('fails the step when no executor is configured for its step type', async () => {
		const stepStore = makeStepStore();
		const queue = makeQueue();
		const deps: ExternalDependencies = {};
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, queue, deps);

		await handler.handle(event);

		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'UnimplementedError',
			message: expect.stringContaining('v1-node') as string,
			stack: expect.any(String) as string,
		});
		expect(queue.publish).toHaveBeenCalledWith({
			type: 'step:completed',
			executionId: 'exec-1',
			stepId: 'step-a',
		});
	});

	it('fails the step when it has more than one predecessor', async () => {
		const stepStore = makeStepStore({ id: 'step-b', nodeId: 'b' });
		const executionStore = makeExecutionStore({
			graph: {
				nodes: graph.nodes,
				edges: [
					...graph.edges,
					// second input into b makes it a fan-in
					{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 1 },
				],
			},
		});
		const executor = makeExecutor();
		const handler = new StepReadyHandler(executionStore, stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle({ ...event, stepId: 'step-b' });

		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith('step-b', {
			name: 'UnimplementedError',
			message: expect.stringContaining('more than one') as string,
			stack: expect.any(String) as string,
		});
	});

	it('fails the step when its node is absent from the execution graph', async () => {
		const stepStore = makeStepStore({ nodeId: 'ghost' });
		const executor = makeExecutor();
		const handler = new StepReadyHandler(makeExecutionStore(), stepStore, makeQueue(), {
			v1StepExecutor: executor,
		});

		await handler.handle(event);

		expect(executor.execute).not.toHaveBeenCalled();
		expect(stepStore.failStep).toHaveBeenCalledWith('step-a', {
			name: 'UnexpectedError',
			message: expect.stringContaining('ghost') as string,
			stack: expect.any(String) as string,
		});
	});
});
