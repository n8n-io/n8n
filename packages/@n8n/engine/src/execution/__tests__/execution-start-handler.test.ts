import { describe, expect, it, vi } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import { ExecutionStartHandler } from '../execution-start-handler';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import type { StepStore } from '../step-store';

function makeExecutionStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		transitionStatus: vi.fn().mockResolvedValue(true),
		finishExecution: vi.fn().mockResolvedValue(true),
		...overrides,
	};
}

function makeOrchestrationQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

/** Only `createSteps` is exercised here; the rest belong to other handlers. */
function makeStepStore(createSteps = vi.fn()): StepStore {
	return {
		createSteps,
		loadStep: vi.fn(),
		claimStep: vi.fn(),
		completeStep: vi.fn(),
		failStep: vi.fn(),
		cancelQueuedSteps: vi.fn(),
		loadStepsByKeys: vi.fn().mockResolvedValue({}),
		loadStepSummariesByKeys: vi.fn().mockResolvedValue({}),
		loadLatestStep: vi.fn().mockResolvedValue(null),
		countSettledSteps: vi.fn(),
		hasFailedSteps: vi.fn(),
	};
}

function record(graph: WorkflowGraph, overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
	return {
		id: 'exec-1',
		workflowId: 'wf-1',
		status: 'running',
		mode: 'production',
		graph,
		triggerOutputs: null,
		...overrides,
	};
}

describe('ExecutionStartHandler', () => {
	it('claims the execution, records the trigger completed, and announces its completion', async () => {
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'T', type: 'trigger' },
				{ id: 'a', name: 'A', type: 'v1-node' },
			],
			edges: [{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 }],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi
				.fn()
				.mockResolvedValue(record(graph, { triggerOutputs: [[{ json: { webhook: 'data' } }]] })),
		});
		const createSteps = vi.fn().mockResolvedValue([{ id: 'step-trigger', nodeId: 'trigger' }]);
		const stepStore = makeStepStore(createSteps);
		const queue = makeOrchestrationQueue();
		const handler = new ExecutionStartHandler(executionStore, stepStore, queue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.transitionStatus).toHaveBeenCalledWith('exec-1', 'queued', 'running');
		// only the trigger's row — planning is the step:settled handler's job.
		// Its payload rides along as output slots, read downstream like any
		// other predecessor's outputs.
		expect(createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{
				nodeId: 'trigger',
				iteration: 0,
				status: 'completed',
				outputs: [[{ json: { webhook: 'data' } }]],
			},
		]);
		expect(queue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-trigger',
		});
	});

	it('records multi-slot trigger payloads verbatim, including dead slots', async () => {
		const graph: WorkflowGraph = {
			nodes: [{ id: 'trigger', name: 'T', type: 'trigger' }],
			edges: [],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(
				record(graph, {
					triggerOutputs: [[{ json: { i1: true } }], null, [{ json: { i2: true } }]],
				}),
			),
		});
		const createSteps = vi.fn().mockResolvedValue([{ id: 'step-trigger', nodeId: 'trigger' }]);
		const stepStore = makeStepStore(createSteps);
		const handler = new ExecutionStartHandler(executionStore, stepStore, makeOrchestrationQueue());

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{
				nodeId: 'trigger',
				iteration: 0,
				status: 'completed',
				outputs: [[{ json: { i1: true } }], null, [{ json: { i2: true } }]],
			},
		]);
	});

	it('records no slots at all when the trigger has no payload', async () => {
		// No payload means no data on any slot — every successor edge reads
		// undefined and is treated as dead, same as any other step producing nothing.
		const graph: WorkflowGraph = {
			nodes: [{ id: 'trigger', name: 'T', type: 'trigger' }],
			edges: [],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph, { triggerOutputs: null })),
		});
		const createSteps = vi.fn().mockResolvedValue([{ id: 'step-trigger', nodeId: 'trigger' }]);
		const stepStore = makeStepStore(createSteps);
		const handler = new ExecutionStartHandler(executionStore, stepStore, makeOrchestrationQueue());

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(createSteps).toHaveBeenCalledExactlyOnceWith('exec-1', [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [] },
		]);
	});

	it('is a no-op when the execution cannot be claimed (duplicate delivery)', async () => {
		const executionStore = makeExecutionStore({
			transitionStatus: vi.fn().mockResolvedValue(false),
		});
		const stepStore = makeStepStore();
		const queue = makeOrchestrationQueue();
		const handler = new ExecutionStartHandler(executionStore, stepStore, queue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.loadExecution).not.toHaveBeenCalled();
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('throws instead of announcing when the trigger row was not inserted', async () => {
		// The claim makes this handler the only writer, so an existing row (empty
		// RETURNING batch) is an invariant violation, not a case to work around.
		const graph: WorkflowGraph = {
			nodes: [{ id: 'trigger', name: 'T', type: 'trigger' }],
			edges: [],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph)),
		});
		const stepStore = makeStepStore(vi.fn().mockResolvedValue([]));
		const queue = makeOrchestrationQueue();
		const handler = new ExecutionStartHandler(executionStore, stepStore, queue);

		await expect(
			handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' }),
		).rejects.toMatchObject({ name: 'UnexpectedError' });

		expect(queue.publish).not.toHaveBeenCalled();
	});

	it('throws when the graph has no trigger node', async () => {
		// The start boundary rejects such graphs, so this execution should never
		// have been created — an invariant violation, not a run that failed.
		const graph: WorkflowGraph = { nodes: [{ id: 'a', name: 'A', type: 'v1-node' }], edges: [] };
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph)),
		});
		const stepStore = makeStepStore();
		const queue = makeOrchestrationQueue();
		const handler = new ExecutionStartHandler(executionStore, stepStore, queue);

		await expect(
			handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' }),
		).rejects.toMatchObject({ name: 'UnexpectedError' });

		expect(executionStore.finishExecution).not.toHaveBeenCalled();
		expect(stepStore.createSteps).not.toHaveBeenCalled();
		expect(queue.publish).not.toHaveBeenCalled();
	});
});
