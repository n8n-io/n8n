import { describe, expect, it } from 'vitest';

import { deriveLoops } from '../loops';
import { getCancellingRaces, getRaceCancelRegion } from '../race-cancel-region';
import type { GraphEdge, GraphNode, WorkflowGraph } from '../workflow-graph';

function makeGraph(
	edges: Array<Partial<GraphEdge> & Pick<GraphEdge, 'from' | 'to'>>,
	types: Record<string, GraphNode['type']> = {},
): WorkflowGraph {
	const nodeIds = [...new Set(edges.flatMap(({ from, to }) => [from, to]))];
	return {
		nodes: nodeIds.map((id) => ({
			id,
			name: id.toUpperCase(),
			type: types[id] ?? (id === 'trigger' ? 'trigger' : id === 'r' ? 'race' : 'v1-node'),
		})),
		edges: edges.map((edge) => ({ outputIndex: 0, inputIndex: 0, ...edge })),
	};
}

function regionOf(graph: WorkflowGraph): string[] {
	return [...getRaceCancelRegion(graph, deriveLoops(graph), 'r')].sort();
}

describe('getRaceCancelRegion', () => {
	it('holds every branch that only feeds the race, but not the trigger', () => {
		// trigger -> a -> b -> r, trigger -> c -> r
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'b' },
			{ from: 'b', to: 'r' },
			{ from: 'trigger', to: 'c' },
			{ from: 'c', to: 'r' },
		]);

		expect(regionOf(graph)).toEqual(['a', 'b', 'c']);
	});

	it('leaves out a node that also feeds something else, and what feeds it', () => {
		// trigger -> a -> b -> r, with a -> log as well
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'b' },
			{ from: 'a', to: 'log' },
			{ from: 'b', to: 'r' },
			{ from: 'trigger', to: 'c' },
			{ from: 'c', to: 'r' },
		]);

		expect(regionOf(graph)).toEqual(['b', 'c']);
	});

	it('leaves out the race successors', () => {
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'r' },
			{ from: 'r', to: 'after' },
		]);

		expect(regionOf(graph)).toEqual(['a']);
	});

	it('keeps to the race loop, and leaves out its batch node', () => {
		// trigger -> pre -> B; B (o1) -> a -> r; B (o1) -> c -> r; r -> B (back)
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'pre' },
				{ from: 'pre', to: 'B' },
				{ from: 'B', to: 'a', outputIndex: 1 },
				{ from: 'B', to: 'c', outputIndex: 1 },
				{ from: 'a', to: 'r' },
				{ from: 'c', to: 'r' },
				{ from: 'r', to: 'B', isBackEdge: true },
			],
			{ B: 'batch' },
		);

		expect(regionOf(graph)).toEqual(['a', 'c']);
	});

	it('leaves out nodes of a loop that the race is outside of', () => {
		// trigger -> B; B (o1) -> body -> B (back); B (o0) -> a -> r; trigger -> c -> r
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'body', outputIndex: 1 },
				{ from: 'body', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'a', outputIndex: 0 },
				{ from: 'a', to: 'r' },
				{ from: 'trigger', to: 'c' },
				{ from: 'c', to: 'r' },
			],
			{ B: 'batch' },
		);

		expect(regionOf(graph)).toEqual(['a', 'c']);
	});
});

describe('getCancellingRaces', () => {
	it('returns only the race nodes set to cancel the other branches', () => {
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'r' },
			{ from: 'a', to: 'keep' },
			{ from: 'trigger', to: 'b' },
			{ from: 'b', to: 'r' },
		]);
		graph.nodes = [
			...graph.nodes.map((node) =>
				node.id === 'r' ? { ...node, config: { cancelOtherBranches: true } } : node,
			),
			{ id: 'r2', name: 'R2', type: 'race', config: { cancelOtherBranches: false } },
			{ id: 'r3', name: 'R3', type: 'race' },
		];

		expect(getCancellingRaces(graph, [])).toEqual([{ raceNodeId: 'r', region: new Set(['b']) }]);
	});
});
