import { describe, expect, it } from 'vitest';

import { deriveLoops, validateLoops } from '../loops';
import type { GraphEdge, StepType, WorkflowGraph } from '../workflow-graph';

/** Nodes are inferred from edges; `batch:` names the batch-typed ones. */
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
 * The canonical shape: entry into B, body x, return to B, exit from B's done slot.
 *
 * ┌───────┐    ┌───┐ o0    ┌───┐
 * │trigger├───►│   ├──────►│ d │
 * └───────┘    │ B │       └───┘
 *              │   │ o1    ┌───┐
 *              │   ├──────►│ x │
 *              └─▲─┘       └─┬─┘
 *                └──(back)───┘
 */
const simpleLoop = makeGraph(
	[
		{ from: 'trigger', to: 'B' },
		{ from: 'B', to: 'x', outputIndex: 1 },
		{ from: 'x', to: 'B', isBackEdge: true },
		{ from: 'B', to: 'd', outputIndex: 0 },
	],
	{ batch: ['B'] },
);

describe('deriveLoops', () => {
	it('derives nothing for a graph without back-edges', () => {
		// ┌───────┐    ┌───┐
		// │trigger├───►│ a │
		// └───────┘    └───┘
		expect(deriveLoops(makeGraph([{ from: 'trigger', to: 'a' }]))).toEqual([]);
	});

	it('derives the members and boundary edges of a simple loop', () => {
		const [loop] = deriveLoops(simpleLoop);

		expect(loop.batchNodeId).toBe('B');
		expect(loop.memberIds).toEqual(new Set(['B', 'x']));
		expect(loop.backEdges).toEqual([
			{ from: 'x', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true },
		]);
		expect(loop.entryEdges).toEqual([{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 }]);
		expect(loop.exitEdges).toEqual([{ from: 'B', to: 'd', outputIndex: 0, inputIndex: 0 }]);
	});

	it('derives a self-loop as a single-member loop', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│ B ├──────►│ d │
		// └───────┘    └▲─┬┘       └───┘
		//               └─┘ o1 (back into its own slot 0)
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'B', outputIndex: 1, isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		const [loop] = deriveLoops(graph);
		expect(loop.memberIds).toEqual(new Set(['B']));
		expect(loop.backEdges).toHaveLength(1);
	});

	it('derives two disjoint loops independently', () => {
		// ┌───────┐    ┌────┐ o1    ┌───┐
		// │trigger├───►│    ├──────►│ x │
		// └───────┘    │ B1 │       └─┬─┘
		//              │    ◄──(back)─┘
		//              └─┬──┘
		//              o0▼
		//              ┌────┐ o1    ┌───┐
		//              │    ├──────►│ y │
		//              │ B2 │       └─┬─┘
		//              │    ◄──(back)─┘
		//              └─┬──┘
		//              o0▼
		//              ┌───┐
		//              │ d │
		//              └───┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B1' },
				{ from: 'B1', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B1', isBackEdge: true },
				{ from: 'B1', to: 'B2', outputIndex: 0 },
				{ from: 'B2', to: 'y', outputIndex: 1 },
				{ from: 'y', to: 'B2', isBackEdge: true },
				{ from: 'B2', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B1', 'B2'] },
		);

		const loops = deriveLoops(graph);
		expect(loops.map((l) => [l.batchNodeId, [...l.memberIds].sort()])).toEqual([
			['B1', ['B1', 'x']],
			['B2', ['B2', 'y']],
		]);
	});
});

describe('validateLoops', () => {
	it('accepts a simple loop, a self-loop, and a branchy body that reconverges', () => {
		expect(() => validateLoops(simpleLoop)).not.toThrow();

		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│ B ├──────►│ d │
		// └───────┘    └▲─┬┘       └───┘
		//               └─┘ o1 (back into its own slot 0)
		const selfLoop = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'B', outputIndex: 1, isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);
		expect(() => validateLoops(selfLoop)).not.toThrow();

		// ┌───────┐    ┌───┐ o1    ┌───┐ o0    ┌────┐ i0    ┌───┐
		// │trigger├───►│   ├──────►│ x ├──────►│ y1 ├──────►│   │
		// └───────┘    │ B │       └─┬─┘       └────┘       │ m │
		//              │   │      o1 │         ┌────┐ i1    │   │
		//              │   │         └────────►│ y2 ├──────►│   │
		//              │   │                   └────┘       └─┬─┘
		//              │   ◄──────────────(back)──────────────┘
		//              └─┬─┘
		//              o0▼
		//              ┌───┐
		//              │ d │
		//              └───┘
		const branchyBody = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'y1', outputIndex: 0 },
				{ from: 'x', to: 'y2', outputIndex: 1 },
				{ from: 'y1', to: 'm', inputIndex: 0 },
				{ from: 'y2', to: 'm', inputIndex: 1 },
				{ from: 'm', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);
		expect(() => validateLoops(branchyBody)).not.toThrow();
	});

	it('accepts a graph without loops', () => {
		// ┌───────┐    ┌───┐
		// │trigger├───►│ a │
		// └───────┘    └───┘
		expect(() => validateLoops(makeGraph([{ from: 'trigger', to: 'a' }]))).not.toThrow();
	});

	it('rejects an edge endpoint that is not a node', () => {
		// ┌───────┐    ┌───┐ o1    ┌───────┐
		// │trigger├───►│ B ├──────►│ ghost │
		// └───────┘    └─▲─┘       └───┬───┘
		//                └───(back)────┘
		// SCC membership would otherwise admit the ghost as a loop member, and
		// the planner would create a row no worker can run
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'T', type: 'trigger' },
				{ id: 'B', name: 'B', type: 'batch' },
			],
			edges: [
				{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 },
				{ from: 'B', to: 'ghost', outputIndex: 1, inputIndex: 0 },
				{ from: 'ghost', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			],
		};

		expect(() => validateLoops(graph)).toThrow(/not a node in the graph/);
	});

	it('rejects duplicate node ids', () => {
		// the canonical shape, but two nodes both claim the id B
		const graph: WorkflowGraph = {
			nodes: [
				{ id: 'trigger', name: 'T', type: 'trigger' },
				{ id: 'B', name: 'B', type: 'batch' },
				{ id: 'B', name: 'B2', type: 'v1-node' },
				{ id: 'x', name: 'X', type: 'v1-node' },
			],
			edges: [
				{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 },
				{ from: 'B', to: 'x', outputIndex: 1, inputIndex: 0 },
				{ from: 'x', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true },
			],
		};

		expect(() => validateLoops(graph)).toThrow(/share the id/);
	});

	it('rejects an unmarked forward cycle among members (rule 1)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│   ├──────►│ d │
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌───┐       ┌───┐
		//              │   ├──────►│ a ├──────►│ c │
		//              │   ◄─(back)┴─▲─┘       └─┬─┘
		//              └───┘         └────i1─────┘
		// B -> a -> c -> a is a cycle no back-edge closes: a and c deadlock waiting
		// on each other's settlement.
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'a', outputIndex: 1 },
				{ from: 'a', to: 'c' },
				{ from: 'c', to: 'a', inputIndex: 1 },
				{ from: 'a', to: 'B', outputIndex: 1, isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/cycle with no back-edge/);
	});

	it('rejects a back-edge returning to a non-batch node (rule 2)', () => {
		// ┌───────┐    ┌───┐       ┌───┐
		// │trigger├───►│ a ├──────►│ x │   a is a plain node
		// └───────┘    └─▲─┘       └─┬─┘
		//                └──(back)───┘
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'x' },
			{ from: 'x', to: 'a', isBackEdge: true },
		]);

		expect(() => validateLoops(graph)).toThrow(/not a batch node/);
	});

	it('rejects a back-edge into a slot other than 0 (rule 2)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│   ├──────►│ d │
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌───┐
		//              │   ├──────►│ x │
		//              └─▲─┘       └─┬─┘
		//                └─(back,i1)─┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', inputIndex: 1, isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/slot 0/);
	});

	it('rejects a back-edge returning from outside the loop (rule 2)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │       ├───►│ B ├──────►│ d │
		// │trigger│    └─▲─┘       └───┘
		// │       │      │ (back)
		// │       │    ┌─┴─┐
		// │       ├───►│ z │
		// └───────┘    └───┘
		// z never receives anything from B, so it is no member, yet returns to it
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'trigger', to: 'z', outputIndex: 0 },
				{ from: 'z', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/outside the loop/);
	});

	it('rejects a batch node nothing returns to (rule 3)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐        ┌────┐ o1    ┌───────┐
		// │trigger├───►│   ├──────►│ d │        │ B2 ├──────►│ other │
		// └───────┘    │ B │       └───┘        └─▲──┘       └───┬───┘
		//              │   │ o1    ┌───┐          └────(back)────┘
		//              │   ├──────►│ x │
		//              └───┘       └───┘   nothing returns to B
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'B', to: 'd', outputIndex: 0 },
				// x -> B exists in a valid loop; here the loop is left open
				{ from: 'other', to: 'B2', isBackEdge: true },
				{ from: 'B2', to: 'other', outputIndex: 1 },
			],
			{ batch: ['B', 'B2'] },
		);

		expect(() => validateLoops(graph)).toThrow(/no back-edge returning to it/);
	});

	it('rejects several returns to one batch node (rule 3, CAT-3982)', () => {
		// ┌───────┐    ┌───┐ o1    ┌───┐       ┌───┐
		// │trigger├───►│ B ├──────►│ x ├──────►│ y │
		// └───────┘    └─▲─┘       └─┬─┘       └─┬─┘
		//                ├─(back,o1)─┘           │
		//                └────────(back)─────────┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'y' },
				{ from: 'x', to: 'B', outputIndex: 1, isBackEdge: true },
				{ from: 'y', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/not supported yet/);
	});

	it('rejects an entry edge into a batch slot other than 0 (rule 4)', () => {
		// ┌───────┐ i1 ┌───┐ o0    ┌───┐
		// │trigger├───►│   ├──────►│ d │
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌───┐
		//              │   ├──────►│ x │
		//              └─▲─┘       └─┬─┘
		//                └──(back)───┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B', inputIndex: 1 },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/only slot 0/);
	});

	it('rejects a batch out-edge beyond slots 0 and 1 (rule 4)', () => {
		// ┌───────┐    ┌───┐ o2    ┌───┐
		// │trigger├───►│   ├──────►│ d │   o2 does not exist on a batch node
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌───┐
		//              │   ├──────►│ x │
		//              └─▲─┘       └─┬─┘
		//                └──(back)───┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 2 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/done \(0\) and loop \(1\)/);

		// same shape, exit on slot -1: `validateLoops` also runs standalone, where
		// nothing has checked slot sanity yet
		const negativeSlot = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: -1 },
			],
			{ batch: ['B'] },
		);
		expect(() => validateLoops(negativeSlot)).toThrow(/done \(0\) and loop \(1\)/);
	});

	it('rejects a dangling body branch (rule 5, sequentiality)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│   ├──────►│ d │
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌───┐ o1    ┌───┐
		//              │   ├──────►│ x ├──────►│ z │
		//              └─▲─┘       └─┬─┘       └───┘
		//                └─(back,o0)─┘
		// z hangs off the body and never returns: its pass i could still run
		// while pass i+1 starts, so it is rejected until a barrier exists.
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'z', outputIndex: 1 },
				{ from: 'x', to: 'B', outputIndex: 0, isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/dangling body branches/);
	});

	it('rejects a loop-slot edge that leaves the loop (rule 5)', () => {
		// ┌───────┐    ┌───┐ o1    ┌───┐
		// │trigger├───►│   ├──────►│ x │
		// └───────┘    │ B │       └─┬─┘
		//              │   ◄──(back)─┘
		//              │   │ o1    ┌───┐
		//              │   ├──────►│ z │   also o1, but z never returns
		//              └───┘       └───┘
		// B's loop slot feeds a node that never returns
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'z', outputIndex: 1 },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/leaves the loop/);
	});

	it('rejects a done slot feeding the loop body (rule 5)', () => {
		// ┌───────┐    ┌───┐ o1    ┌───┐
		// │trigger├───►│   ├──────►│   │
		// └───────┘    │ B │       │ x │
		//              │   │ o0 i1 │   │
		//              │   ├──────►│   │
		//              └─▲─┘       └─┬─┘
		//                └──(back)───┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'B', to: 'x', outputIndex: 0, inputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/member of its own loop/);
	});

	it('rejects an edge entering the loop mid-body (rule 5)', () => {
		// ┌───────┐    ┌───┐ o1    ┌───┐
		// │trigger├───►│ B ├──────►│ x │
		// └───────┘    └─▲─┘       └─┬─┘
		//                └──(back)───┘
		// the trigger also feeds x's slot 1, entering the body without passing B
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'trigger', to: 'x', outputIndex: 0, inputIndex: 1 },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/mid-body/);
	});

	it('rejects several entry edges into one batch node (CAT-3982)', () => {
		// ┌───────┐ o0 ┌────┐
		// │       ├───►│ p1 ├──┐
		// │       │    └────┘  │  ┌───┐ o0    ┌───┐
		// │trigger│            └─►│   ├──────►│ d │
		// │       │ o1 ┌────┐  ┌─►│ B │       └───┘
		// │       ├───►│ p2 ├──┘  │   │ o1    ┌───┐
		// └───────┘    └────┘     │   ├──────►│ x │
		//                         └─▲─┘       └─┬─┘
		//                           └──(back)───┘
		// both branches feed B's slot 0 at iteration 0: same-slot convergence
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'p1', outputIndex: 0 },
				{ from: 'trigger', to: 'p2', outputIndex: 1 },
				{ from: 'p1', to: 'B' },
				{ from: 'p2', to: 'B' },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/2 entry edges/);
	});

	it('rejects a self-loop returning from the done slot (rule 5)', () => {
		// ┌───────┐    ┌───┐
		// │trigger├───►│ B │
		// └───────┘    └▲─┬┘
		//               └─┘ o0 (back from the done slot)
		// the done slot is dead while items remain, so this loop would end after
		// its first slice
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'B', outputIndex: 0, isBackEdge: true },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/member of its own loop/);
	});

	it('reports a malformed entry slot over unsupported convergence (rules 4 vs 3982)', () => {
		// ┌───────┐ o0 ┌────┐
		// │       ├───►│ p1 ├──┐
		// │       │    └────┘  │  ┌───┐ o0    ┌───┐
		// │trigger│            └─►│   ├──────►│ d │
		// │       │ o1 ┌────┐  ┌─►│ B │       └───┘
		// │       ├───►│ p2 ├──┘  │   │ o1    ┌───┐
		// └───────┘    └────┘     │   ├──────►│ x │
		//                         └─▲─┘       └─┬─┘
		//                           └──(back)───┘
		// as above, but p2 arrives on B's slot 1
		// the slot-1 entry can never be valid: it outranks unsupported convergence
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'p1', outputIndex: 0 },
				{ from: 'trigger', to: 'p2', outputIndex: 1 },
				{ from: 'p1', to: 'B' },
				{ from: 'p2', to: 'B', inputIndex: 1 },
				{ from: 'B', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B'] },
		);

		expect(() => validateLoops(graph)).toThrow(/only slot 0/);
	});

	it('reports a non-batch back-edge target as such, even beside a batch node (rule 2)', () => {
		// ┌───────┐    ┌───┐       ┌────┐
		// │trigger├───►│ a ├──────►│ B2 │
		// └───────┘    └─▲─┘       └▲─┬┬┘
		//                │          └─┘│ o1 (back into its own slot 0)
		//                └───(back, o0)┘
		// a and B2 share one component; the defect is the target, not nesting
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'a' },
				{ from: 'a', to: 'B2' },
				{ from: 'B2', to: 'a', outputIndex: 0, isBackEdge: true },
				{ from: 'B2', to: 'B2', outputIndex: 1, isBackEdge: true },
			],
			{ batch: ['B2'] },
		);

		expect(() => validateLoops(graph)).toThrow(/not a batch node/);
	});

	it('rejects a nested loop (rule 5)', () => {
		// ┌───────┐    ┌───┐ o0    ┌───┐
		// │trigger├───►│   ├──────►│ d │
		// └───────┘    │ B │       └───┘
		//              │   │ o1    ┌────┐ o1    ┌───┐
		//              │   ├──────►│    ├──────►│ x │
		//              │   │       │ B2 │       └─┬─┘
		//              │   │       │    ◄──(back)─┘
		//              │   │       └─┬──┘ o0
		//              │   │      ┌──▼───┐
		//              │   ◄──────┤ tail │ (back)
		//              └───┘      └──────┘
		const graph = makeGraph(
			[
				{ from: 'trigger', to: 'B' },
				{ from: 'B', to: 'B2', outputIndex: 1 },
				{ from: 'B2', to: 'x', outputIndex: 1 },
				{ from: 'x', to: 'B2', isBackEdge: true },
				{ from: 'B2', to: 'tail', outputIndex: 0 },
				{ from: 'tail', to: 'B', isBackEdge: true },
				{ from: 'B', to: 'd', outputIndex: 0 },
			],
			{ batch: ['B', 'B2'] },
		);

		expect(() => validateLoops(graph)).toThrow(/nested loops are not supported yet/);
	});
});
