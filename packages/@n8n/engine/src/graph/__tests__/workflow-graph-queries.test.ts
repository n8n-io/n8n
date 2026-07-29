import { describe, expect, it } from 'vitest';

import type { WorkflowGraph } from '../workflow-graph';
import {
	findTriggerNode,
	getPredecessorNodeIds,
	getSuccessorNodeIds,
} from '../workflow-graph-queries';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Trigger', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node' },
		{ id: 'b', name: 'B', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 },
		{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 },
		// Same target from a second output slot — must not be reported twice.
		{ from: 'trigger', to: 'a', outputIndex: 1, inputIndex: 0 },
		{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
	],
};

describe('findTriggerNode', () => {
	it('returns the trigger node', () => {
		expect(findTriggerNode(graph)?.id).toBe('trigger');
	});

	it('returns undefined when there is no trigger', () => {
		expect(
			findTriggerNode({ nodes: [{ id: 'a', name: 'A', type: 'v1-node' }], edges: [] }),
		).toBeUndefined();
	});
});

describe('getSuccessorNodeIds', () => {
	it('returns forward successors in edge order, de-duplicated', () => {
		expect(getSuccessorNodeIds(graph, 'trigger')).toEqual(['a', 'b']);
	});

	it('returns an empty array for a node with no outgoing edges', () => {
		expect(getSuccessorNodeIds(graph, 'b')).toEqual([]);
	});

	it('returns an empty array for an unknown node', () => {
		expect(getSuccessorNodeIds(graph, 'nope')).toEqual([]);
	});
});

describe('getPredecessorNodeIds', () => {
	it('returns predecessors in edge order, de-duplicated', () => {
		expect(getPredecessorNodeIds(graph, 'b')).toEqual(['trigger', 'a']);
	});

	it('de-duplicates a predecessor reaching the same target from two output slots', () => {
		expect(getPredecessorNodeIds(graph, 'a')).toEqual(['trigger']);
	});

	it('returns an empty array for the trigger node', () => {
		expect(getPredecessorNodeIds(graph, 'trigger')).toEqual([]);
	});

	it('returns an empty array for an unknown node', () => {
		expect(getPredecessorNodeIds(graph, 'nope')).toEqual([]);
	});

	it('includes back-edges, matching getSuccessorNodeIds', () => {
		const looping: WorkflowGraph = {
			nodes: [
				{ id: 'a', name: 'A', type: 'v1-node' },
				{ id: 'b', name: 'B', type: 'v1-node' },
			],
			edges: [
				{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'a', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			],
		};
		expect(getPredecessorNodeIds(looping, 'a')).toEqual(['b']);
	});
});
