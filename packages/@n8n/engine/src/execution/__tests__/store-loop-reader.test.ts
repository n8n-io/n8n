import { describe, expect, it, vi } from 'vitest';

import { deriveLoops, type WorkflowGraph } from '../../graph';
import { stepKeyId, type StepSlots } from '../execution.types';
import type { StepRecord, StepStore } from '../step-store';
import { createStoreLoopReader } from '../store-loop-reader';

/**
 * ┌─────────┐    ┌────┐ o1    ┌──────┐ o1    ┌──────┐
 * │ trigger ├───►│ If ├──────►│ Loop ├──────►│ Body │
 * └─────────┘    └────┘       └──▲───┘       └──┬───┘
 *                                └────(back)────┘
 */
const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Trigger', type: 'trigger' },
		{ id: 'if', name: 'If', type: 'v1-node' },
		{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
		{ id: 'body', name: 'Body', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'if', outputIndex: 0, inputIndex: 0 },
		{ from: 'if', to: 'loop', outputIndex: 1, inputIndex: 0 },
		{ from: 'loop', to: 'body', outputIndex: 1, inputIndex: 0 },
		{ from: 'body', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
	],
};

function completed(nodeId: string, iteration: number, outputs: StepSlots): StepRecord {
	return {
		id: `step-${nodeId}-${iteration}`,
		executionId: 'exec-1',
		nodeId,
		iteration,
		status: 'completed',
		outputs,
		outputSources: null,
		waitDeclaration: null,
		resumeCause: null,
	};
}

describe('createStoreLoopReader', () => {
	it('reads the original items from the output slot the entry edge leaves, and names that slot', async () => {
		const ifStep = completed('if', 0, [
			[{ json: { branch: 'true' } }],
			[{ json: { branch: 'false' } }],
		]);
		const stepStore = {
			loadStepsByKeys: vi.fn().mockResolvedValue({ [stepKeyId(ifStep)]: ifStep }),
		} as unknown as StepStore;
		const loops = deriveLoops(graph);
		const [loop] = loops;

		const reader = createStoreLoopReader(stepStore, 'exec-1', loops, loop, new Map());

		expect(await reader.readOriginalItems()).toEqual({
			items: [{ json: { branch: 'false' } }],
			from: { nodeId: 'if', outputIndex: 1, iteration: 0 },
		});
	});
});
