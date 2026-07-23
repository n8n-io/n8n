import { describe, expect, it, vi } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import { InMemoryWorkQueue, type StepMessage } from '../../queue';
import { ExecutionStartHandler } from '../execution-start-handler';
import type { ExecutionRecord, ExecutionStore } from '../execution-store';
import type { StepStore } from '../step-store';

function makeExecutionStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		transitionStatus: vi.fn().mockResolvedValue(true),
		failExecution: vi.fn().mockResolvedValue(true),
		...overrides,
	};
}

function record(graph: WorkflowGraph): ExecutionRecord {
	return {
		id: 'exec-1',
		workflowId: 'wf-1',
		status: 'running',
		mode: 'production',
		graph,
		triggerPayload: null,
	};
}

describe('ExecutionStartHandler', () => {
	it('records the trigger completed and enqueues a queued step per successor', async () => {
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'T', type: 'trigger' },
				{ id: 'a', name: 'A', type: 'v1-node' },
				{ id: 'b', name: 'B', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'a' },
				{ from: 'trigger', to: 'b' },
			],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph)),
		});
		const createStep = vi
			.fn()
			.mockResolvedValueOnce({ id: 'step-trigger' })
			.mockResolvedValueOnce({ id: 'step-a' })
			.mockResolvedValueOnce({ id: 'step-b' });
		const stepStore: StepStore = { createStep };
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const handler = new ExecutionStartHandler(executionStore, stepStore, stepQueue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.transitionStatus).toHaveBeenCalledWith('exec-1', 'queued', 'running');
		// trigger recorded completed, then each successor recorded queued
		expect(createStep).toHaveBeenNthCalledWith(1, {
			executionId: 'exec-1',
			nodeId: 'trigger',
			status: 'completed',
		});
		expect(createStep).toHaveBeenNthCalledWith(2, {
			executionId: 'exec-1',
			nodeId: 'a',
			status: 'queued',
		});
		expect(createStep).toHaveBeenNthCalledWith(3, {
			executionId: 'exec-1',
			nodeId: 'b',
			status: 'queued',
		});
		// step:ready references the queued step-record ids
		expect(stepQueue.messages).toEqual([
			{ type: 'step:ready', executionId: 'exec-1', stepId: 'step-a' },
			{ type: 'step:ready', executionId: 'exec-1', stepId: 'step-b' },
		]);
	});

	it('is a no-op when the execution cannot be claimed (duplicate delivery)', async () => {
		const executionStore = makeExecutionStore({
			transitionStatus: vi.fn().mockResolvedValue(false),
		});
		const stepStore: StepStore = { createStep: vi.fn() };
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const handler = new ExecutionStartHandler(executionStore, stepStore, stepQueue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.loadExecution).not.toHaveBeenCalled();
		expect(stepStore.createStep).not.toHaveBeenCalled();
		expect(stepQueue.messages).toHaveLength(0);
	});

	it('fails the execution when the graph has no trigger node', async () => {
		const graph: WorkflowGraph = { nodes: [{ id: 'a', name: 'A', type: 'v1-node' }], edges: [] };
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph)),
		});
		const stepStore: StepStore = { createStep: vi.fn() };
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const handler = new ExecutionStartHandler(executionStore, stepStore, stepQueue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.failExecution).toHaveBeenCalledWith('exec-1');
		expect(stepStore.createStep).not.toHaveBeenCalled();
		expect(stepQueue.messages).toHaveLength(0);
	});

	it('records the trigger but enqueues nothing for a trigger with no successors', async () => {
		const graph: WorkflowGraph = {
			nodes: [{ id: 'trigger', name: 'T', type: 'trigger' }],
			edges: [],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue(record(graph)),
		});
		const createStep = vi.fn().mockResolvedValue({ id: 'step-trigger' });
		const stepStore: StepStore = { createStep };
		const stepQueue = new InMemoryWorkQueue<StepMessage>();
		const handler = new ExecutionStartHandler(executionStore, stepStore, stepQueue);

		await handler.handle({ type: 'execution:enqueued', executionId: 'exec-1' });

		expect(executionStore.failExecution).not.toHaveBeenCalled();
		expect(createStep).toHaveBeenCalledTimes(1);
		expect(createStep).toHaveBeenCalledWith({
			executionId: 'exec-1',
			nodeId: 'trigger',
			status: 'completed',
		});
		expect(stepQueue.messages).toHaveLength(0);
	});
});
