import { describe, expect, it } from 'vitest';

import type { WorkflowGraph } from '../../graph';
import type { StepSlots, StepStatus } from '../execution.types';
import type { StepRecord } from '../step-store';
import { collectSubExecutionResult } from '../sub-execution-resume';

function row(
	nodeId: string,
	status: StepStatus,
	outputs: StepSlots | null,
	iteration = 0,
): StepRecord {
	return {
		id: `step-${nodeId}-${iteration}`,
		executionId: 'exec-1',
		nodeId,
		iteration,
		status,
		outputs,
		waitDeclaration: null,
		resumeCause: null,
	};
}

describe('collectSubExecutionResult', () => {
	it('returns the completed terminal steps in graph order, then by pass', async () => {
		// trigger -> a -> {b, c}: both b and c are terminal, b before c in the graph.
		const forked: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'T', type: 'trigger' },
				{ id: 'a', name: 'A', type: 'v1-node' },
				{ id: 'b', name: 'B', type: 'v1-node' },
				{ id: 'c', name: 'C', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'c', outputIndex: 1, inputIndex: 0 },
			],
		};

		const result = collectSubExecutionResult(forked, [
			row('c', 'completed', [[{ json: { c: 1 } }]], 1),
			row('b', 'skipped', null, 1),
			row('c', 'completed', [[{ json: { c: 0 } }]], 0),
			row('b', 'completed', [[{ json: { b: 0 } }]], 0),
			row('a', 'completed', [[{ json: { a: 1 } }]]),
			row('trigger', 'completed', [[]]),
		]);

		expect(result).toEqual([
			{ nodeId: 'b', iteration: 0, outputs: [[{ json: { b: 0 } }]] },
			{ nodeId: 'c', iteration: 0, outputs: [[{ json: { c: 0 } }]] },
			{ nodeId: 'c', iteration: 1, outputs: [[{ json: { c: 1 } }]] },
		]);
	});

	// trigger -> loop(batch) -> x -> loop (back-edge)
	const loopNodes: WorkflowGraph['nodes'] = [
		{ id: 'trigger', name: 'T', type: 'trigger' },
		{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
		{ id: 'x', name: 'X', type: 'v1-node' },
	];
	const loopEdges: WorkflowGraph['edges'] = [
		{ from: 'trigger', to: 'loop', outputIndex: 0, inputIndex: 0 },
		{ from: 'loop', to: 'x', outputIndex: 1, inputIndex: 0 },
		{ from: 'x', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
	];
	const loopSteps = [
		row('trigger', 'completed', [[]]),
		row('loop', 'completed', [[], [{ json: { i: 0 } }]], 0),
		row('x', 'completed', [[{ json: { x: 0 } }]], 0),
		row('loop', 'completed', [[], [{ json: { i: 1 } }]], 1),
		row('x', 'completed', [[{ json: { x: 1 } }]], 1),
		row('loop', 'completed', [[{ json: { done: true } }], []], 2),
	];

	it('returns the pass that ended a loop when the sub-workflow ends at the loop', () => {
		const result = collectSubExecutionResult({ nodes: loopNodes, edges: loopEdges }, loopSteps);

		expect(result).toEqual([
			{ nodeId: 'loop', iteration: 2, outputs: [[{ json: { done: true } }], []] },
		]);
	});

	it('treats the node after a loop as terminal instead, when one exists', () => {
		const graph: WorkflowGraph = {
			nodes: [...loopNodes, { id: 'after', name: 'After', type: 'v1-node' }],
			edges: [...loopEdges, { from: 'loop', to: 'after', outputIndex: 0, inputIndex: 0 }],
		};

		const result = collectSubExecutionResult(graph, [
			...loopSteps,
			row('after', 'completed', [[{ json: { after: true } }]]),
		]);

		expect(result).toEqual([
			{ nodeId: 'after', iteration: 0, outputs: [[{ json: { after: true } }]] },
		]);
	});
});
