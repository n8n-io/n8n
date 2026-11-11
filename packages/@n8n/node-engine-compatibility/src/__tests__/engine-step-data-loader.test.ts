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
	iteration: 0,
	branch: 0,
	callerContext: { hostMode: 'trigger' },
	responseExpectation: { kind: 'none' },
} as const;

describe('createEngineStepDataLoader', () => {
	const step = (
		nodeId: string,
		iteration: number,
		branch: number,
		status: string,
		outputs: unknown,
	) => ({
		nodeId,
		iteration,
		branch,
		status,
		outputs,
		sources: [{ nodeId: 't', iteration: 0, branch: 0, outputIndex: 0 }],
	});

	it('numbers runs across passes, so a pass with two runs shifts the next pass', async () => {
		const executionStore = {
			loadExecution: vi.fn().mockResolvedValue({ id: 'exec-1', graph }),
		} as unknown as ExecutionStore;
		const stepStore = {
			loadAllSteps: vi
				.fn()
				.mockResolvedValue([
					step('a', 0, 0, 'completed', [[{ json: { run: 'pass 0, branch 0' } }]]),
					step('a', 0, 1, 'completed', [[{ json: { run: 'pass 0, branch 1' } }]]),
					step('a', 1, 0, 'completed', [[{ json: { run: 'pass 1, branch 0' } }]]),
				]),
		} as unknown as StepStore;

		const stepData = await createEngineStepDataLoader(executionStore, stepStore)(context);

		expect(stepData.outputsByNode.a).toEqual({
			0: [[{ json: { run: 'pass 0, branch 0' } }]],
			1: [[{ json: { run: 'pass 0, branch 1' } }]],
			2: [[{ json: { run: 'pass 1, branch 0' } }]],
		});
	});

	it('loads the graph and the outputs of every completed step', async () => {
		const executionStore = {
			loadExecution: vi.fn().mockResolvedValue({ id: 'exec-1', graph }),
		} as unknown as ExecutionStore;
		const stepStore = {
			// the trigger's completed step carries its payload as output slot 0, and
			// `a` ran twice, once per pass of a loop
			loadAllSteps: vi.fn().mockResolvedValue([
				{
					nodeId: 't',
					iteration: 0,
					branch: 0,
					sources: null,
					status: 'completed',
					outputs: [{ body: { hello: 'world' } }],
				},
				step('a', 0, 0, 'completed', [[{ json: { from: 'a' } }]]),
				step('a', 1, 0, 'completed', [[{ json: { from: 'a2' } }]]),
				step('b', 0, 0, 'running', null),
			]),
		} as unknown as StepStore;

		const loadStepData = createEngineStepDataLoader(executionStore, stepStore);
		const stepData = await loadStepData(context);

		expect(executionStore.loadExecution).toHaveBeenCalledWith('exec-1');
		expect(stepStore.loadAllSteps).toHaveBeenCalledWith('exec-1');
		expect(stepData.graph).toBe(graph);
		// keyed by iteration, so a loop member's passes stay apart. Incomplete steps
		// are omitted, not mapped to null, so expressions referencing them fail as
		// "hasn't been executed"
		expect(stepData.outputsByNode).toEqual({
			t: { 0: [{ body: { hello: 'world' } }] },
			a: { 0: [[{ json: { from: 'a' } }]], 1: [[{ json: { from: 'a2' } }]] },
		});
	});
});
