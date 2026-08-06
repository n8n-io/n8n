import { describe, expect, it } from 'vitest';

import { UnimplementedError } from '../../common';
import { GraphValidationError, validateExecutableGraph } from '../validate-executable-graph';
import type { WorkflowGraph } from '../workflow-graph';

const validGraph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'T', type: 'trigger' },
		{ id: 'a', name: 'A', type: 'v1-node' },
	],
	edges: [{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 0 }],
};

describe('validateExecutableGraph', () => {
	it('accepts a graph with a trigger and forward edges', () => {
		expect(() => validateExecutableGraph(validGraph)).not.toThrow();
	});

	it('rejects a graph without a trigger node', () => {
		const graph: WorkflowGraph = {
			nodes: [{ id: 'a', name: 'A', type: 'v1-node' }],
			edges: [],
		};

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('no trigger node');
	});

	it('rejects a graph with more than one trigger node', () => {
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'trigger-2', name: 'T2', type: 'trigger' }],
			edges: validGraph.edges,
		};

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('one trigger node');
	});

	it('rejects a graph with a back-edge as unimplemented', () => {
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'b', name: 'B', type: 'v1-node' }],
			edges: [
				...validGraph.edges,
				{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'a', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			],
		};

		expect(() => validateExecutableGraph(graph)).toThrow(UnimplementedError);
	});
});
