import { describe, expect, it } from 'vitest';

import type { WorkflowGraph } from '../workflow-graph';
import { findTriggerNode, getSuccessorNodeIds } from '../workflow-graph-queries';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Trigger', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node' },
		{ id: 'b', name: 'B', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'a' },
		{ from: 'trigger', to: 'b' },
		{ from: 'a', to: 'b' },
		{ from: 'b', to: 'a', isBackEdge: true },
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

	it('ignores back-edges', () => {
		// b -> a is a back-edge, so b has no forward successors.
		expect(getSuccessorNodeIds(graph, 'b')).toEqual([]);
	});

	it('returns an empty array for an unknown node', () => {
		expect(getSuccessorNodeIds(graph, 'nope')).toEqual([]);
	});
});
