import type { ExecutionStore, StepStore, WorkflowGraph } from '@n8n/engine';
import { describe, expect, it, vi } from 'vitest';

import { createEngineStepDataLoader } from '../engine-step-data-loader';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 't', name: 'Trigger', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node' },
		{ id: 'b', name: 'B', type: 'v1-node' },
	],
	edges: [
		{ from: 't', to: 'a', outputIndex: 0, inputIndex: 0 },
		{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
	],
};

const context = {
	executionId: 'exec-1',
	stepId: 'step-b',
	workflowId: 'wf-1',
	mode: 'production',
} as const;

describe('createEngineStepDataLoader', () => {
	it('loads the graph and the outputs of every completed step', async () => {
		const executionStore = {
			loadExecution: vi.fn().mockResolvedValue({ id: 'exec-1', graph }),
		} as unknown as ExecutionStore;
		const stepStore = {
			// the trigger's completed row carries its payload as output slot 0
			loadStepsByNodeIds: vi.fn().mockResolvedValue({
				t: { nodeId: 't', status: 'completed', outputs: [{ body: { hello: 'world' } }] },
				a: { nodeId: 'a', status: 'completed', outputs: [[{ json: { from: 'a' } }]] },
				b: { nodeId: 'b', status: 'running', outputs: null },
			}),
		} as unknown as StepStore;

		const loadStepData = createEngineStepDataLoader(executionStore, stepStore);
		const stepData = await loadStepData(context);

		expect(executionStore.loadExecution).toHaveBeenCalledWith('exec-1');
		expect(stepStore.loadStepsByNodeIds).toHaveBeenCalledWith('exec-1', ['t', 'a', 'b']);
		expect(stepData.graph).toBe(graph);
		// incomplete steps are omitted, not mapped to null, so expressions
		// referencing them fail as "hasn't been executed"
		expect(stepData.outputsByNodeId).toEqual({
			t: [{ body: { hello: 'world' } }],
			a: [[{ json: { from: 'a' } }]],
		});
	});
});
