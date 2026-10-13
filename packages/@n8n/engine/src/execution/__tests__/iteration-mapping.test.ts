import { describe, expect, it } from 'vitest';

import { deriveLoops } from '../../graph';
import type { GraphEdge, StepType, WorkflowGraph } from '../../graph';
import { classifyEdge, sourceRow, targetKey } from '../iteration-mapping';

function makeGraph(
	edges: Array<Partial<GraphEdge> & Pick<GraphEdge, 'from' | 'to'>>,
	{ batch = [] as string[] } = {},
): WorkflowGraph {
	const nodeIds = [...new Set(edges.flatMap(({ from, to }) => [from, to]))];
	const typeOf = (id: string): StepType =>
		id === 'trigger' ? 'trigger' : batch.includes(id) ? 'batch' : 'v1-node';
	return {
		nodes: nodeIds.map((id) => ({ id, name: id.toUpperCase(), type: typeOf(id) })),
		edges: edges.map((edge) => ({ outputIndex: 0, inputIndex: 0, ...edge })),
	};
}

/**
 * ┌───────┐    ┌───┐ o0    ┌───┐
 * │trigger├───►│   ├──────►│ d │
 * └───────┘    │ B │       └───┘
 *              │   │ o1    ┌───┐
 *              │   ├──────►│ x │
 *              └─▲─┘       └─┬─┘
 *                └──(back)───┘
 */
const loop = makeGraph(
	[
		{ from: 'trigger', to: 'B' },
		{ from: 'B', to: 'x', outputIndex: 1 },
		{ from: 'x', to: 'B', isBackEdge: true },
		{ from: 'B', to: 'd', outputIndex: 0 },
	],
	{ batch: ['B'] },
);

const loops = deriveLoops(loop);
const edge = (from: string, to: string): GraphEdge =>
	loop.edges.find((e) => e.from === from && e.to === to)!;
const classOf = (from: string, to: string) => classifyEdge(edge(from, to), loops);

describe('classifyEdge', () => {
	it('classifies the four edges around a loop', () => {
		expect(classOf('trigger', 'B')).toBe('entry');
		expect(classOf('B', 'x')).toBe('intra');
		expect(classOf('x', 'B')).toBe('back');
		expect(classOf('B', 'd')).toBe('exit');
	});

	it('classifies edges of a loopless graph as plain', () => {
		const flat = makeGraph([{ from: 'trigger', to: 'a' }]);
		expect(classifyEdge(flat.edges[0], deriveLoops(flat))).toBe('plain');
	});

	it('classifies an edge from one loop into the next as exit', () => {
		// two simple loops chained: an edge leaves B1's done slot into B2
		const chained = makeGraph(
			[
				{ from: 'trigger', to: 'B1' },
				{ from: 'B1', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B1', isBackEdge: true },
				{ from: 'B1', to: 'B2', outputIndex: 0 },
				{ from: 'B2', to: 'y', outputIndex: 1 },
				{ from: 'y', to: 'B2', isBackEdge: true },
			],
			{ batch: ['B1', 'B2'] },
		);
		const chainEdge = chained.edges.find((e) => e.from === 'B1' && e.to === 'B2')!;

		expect(classifyEdge(chainEdge, deriveLoops(chained))).toBe('exit');
	});
});

describe('targetKey', () => {
	it('keeps the iteration inside the loop', () => {
		expect(targetKey(edge('B', 'x'), 'intra', { nodeId: 'B', iteration: 2 })).toEqual({
			nodeId: 'x',
			iteration: 2,
		});
	});

	it('advances the iteration across the return edge', () => {
		expect(targetKey(edge('x', 'B'), 'back', { nodeId: 'x', iteration: 2 })).toEqual({
			nodeId: 'B',
			iteration: 3,
		});
	});

	it('drops back to iteration 0 when leaving the loop', () => {
		expect(targetKey(edge('B', 'd'), 'exit', { nodeId: 'B', iteration: 7 })).toEqual({
			nodeId: 'd',
			iteration: 0,
		});
	});

	it('targets iteration 0 through the entry edge', () => {
		expect(targetKey(edge('trigger', 'B'), 'entry', { nodeId: 'trigger', iteration: 0 })).toEqual({
			nodeId: 'B',
			iteration: 0,
		});
	});
});

describe('sourceRow', () => {
	const row = (nodeId: string, iteration: number) => ({
		kind: 'row',
		key: { nodeId, iteration },
	});

	it('reads the same iteration inside the loop', () => {
		expect(sourceRow(edge('B', 'x'), 'intra', { nodeId: 'x', iteration: 2 })).toEqual(row('B', 2));
	});

	it('reads the previous iteration across the return edge', () => {
		expect(sourceRow(edge('x', 'B'), 'back', { nodeId: 'B', iteration: 3 })).toEqual(row('x', 2));
	});

	it('reads the terminal row across an exit edge', () => {
		expect(sourceRow(edge('B', 'd'), 'exit', { nodeId: 'd', iteration: 0 }, 4)).toEqual(
			row('B', 4),
		);
	});

	it('reads the entry edge at iteration 0 only, later iterations coming from the return edge', () => {
		expect(sourceRow(edge('trigger', 'B'), 'entry', { nodeId: 'B', iteration: 0 })).toEqual(
			row('trigger', 0),
		);
		expect(sourceRow(edge('trigger', 'B'), 'entry', { nodeId: 'B', iteration: 1 })).toEqual({
			kind: 'none',
		});
	});

	// `none` and `pending` are both empty, and the caller has to treat them
	// differently: ignore the first, hold the decision open on the second.
	it('distinguishes an edge that does not apply from one waiting for the loop to end', () => {
		// a return edge has no source row at target iteration 0
		expect(sourceRow(edge('x', 'B'), 'back', { nodeId: 'B', iteration: 0 })).toEqual({
			kind: 'none',
		});

		// an exit edge does apply here, but its terminal source row does not exist yet
		expect(sourceRow(edge('B', 'd'), 'exit', { nodeId: 'd', iteration: 0 })).toEqual({
			kind: 'pending',
		});
	});
});
