import { describe, expect, it } from 'vitest';

import { UnimplementedError } from '../../common';
import { GraphValidationError } from '../graph-validation.error';
import { validateExecutableGraph } from '../validate-executable-graph';
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

	it('rejects an edge feeding a reachable node from one the trigger cannot reach', () => {
		// nothing ever reaches r, so it never settles and a would wait forever
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'r', name: 'R', type: 'v1-node' }],
			edges: [...validGraph.edges, { from: 'r', to: 'a', outputIndex: 0, inputIndex: 1 }],
		};

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('would wait on r forever');
	});

	it('accepts a disconnected island that feeds nothing reachable', () => {
		// parked nodes are v1-legal and never considered
		const graph: WorkflowGraph = {
			nodes: [
				...validGraph.nodes,
				{ id: 'r', name: 'R', type: 'v1-node' },
				{ id: 's', name: 'S', type: 'v1-node' },
			],
			edges: [...validGraph.edges, { from: 'r', to: 's', outputIndex: 0, inputIndex: 0 }],
		};

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it('accepts a fan-out: several edges leaving one output slot', () => {
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'b', name: 'B', type: 'v1-node' }],
			edges: [...validGraph.edges, { from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 }],
		};

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it.each([
		{ slot: 'input', edge: { from: 'trigger', to: 'a', outputIndex: 0, inputIndex: -1 } },
		{ slot: 'input', edge: { from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 1.5 } },
		{ slot: 'input', edge: { from: 'trigger', to: 'a', outputIndex: 0, inputIndex: NaN } },
		{ slot: 'output', edge: { from: 'trigger', to: 'a', outputIndex: NaN, inputIndex: 0 } },
	])('rejects an edge whose $slot slot index is $edge', ({ edge }) => {
		const graph: WorkflowGraph = { nodes: validGraph.nodes, edges: [edge] };

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('non-negative integer');
	});

	it('rejects an edge whose input slot index is above 100', () => {
		const graph: WorkflowGraph = {
			nodes: validGraph.nodes,
			edges: [{ from: 'trigger', to: 'a', outputIndex: 0, inputIndex: 101 }],
		};

		expect(() => validateExecutableGraph(graph)).toThrow(GraphValidationError);
		expect(() => validateExecutableGraph(graph)).toThrow('above 100');
	});

	it('accepts a fan-out across output slots (If/Switch shape)', () => {
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'b', name: 'B', type: 'v1-node' }],
			edges: [...validGraph.edges, { from: 'a', to: 'b', outputIndex: 1, inputIndex: 0 }],
		};

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it('accepts a fan-in: edges into distinct input slots of one node', () => {
		const graph: WorkflowGraph = {
			nodes: [
				...validGraph.nodes,
				{ id: 'b', name: 'B', type: 'v1-node' },
				{ id: 'm', name: 'M', type: 'v1-node' },
			],
			edges: [
				...validGraph.edges,
				{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'm', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'm', outputIndex: 0, inputIndex: 1 },
			],
		};

		expect(() => validateExecutableGraph(graph)).not.toThrow();
	});

	it('rejects two edges into the same input slot of one node as unimplemented', () => {
		const graph: WorkflowGraph = {
			nodes: [...validGraph.nodes, { id: 'b', name: 'B', type: 'v1-node' }],
			edges: [
				...validGraph.edges,
				{ from: 'trigger', to: 'b', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 },
			],
		};

		expect(() => validateExecutableGraph(graph)).toThrow(UnimplementedError);
		expect(() => validateExecutableGraph(graph)).toThrow('more than one edge');
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
