import { describe, expect, it } from 'vitest';

import type { GraphEdge, WorkflowGraph } from '../../graph';
import { deriveLoops, getDescendantNodeIds } from '../../graph';
import { stepKeyId, type StepKey, type StepStatus } from '../execution.types';
import { decideSuccessors, type SuccessorDecisions } from '../settlement';
import type { StepSummary } from '../step-store';

function summary(
	nodeId: string,
	status: StepStatus,
	filledOutputSlots: boolean[] = [],
): StepSummary {
	return { id: `step-${nodeId}`, nodeId, iteration: 0, status, filledOutputSlots };
}

function makeSteps(...summaries: StepSummary[]): Record<string, StepSummary> {
	return Object.fromEntries(summaries.map((s) => [stepKeyId(s), s]));
}

function keyFor(nodeId: string): StepKey {
	return { nodeId, iteration: 0 };
}

/** No loops, so there is no loop set and no loop that could have ended. */
function decideLoopless(
	graph: WorkflowGraph,
	settled: StepKey,
	steps: Record<string, StepSummary>,
): SuccessorDecisions {
	return decideSuccessors(graph, [], settled, steps, new Map());
}

function makeGraph(
	edges: Array<Partial<GraphEdge> & Pick<GraphEdge, 'from' | 'to'>>,
): WorkflowGraph {
	const nodeIds = [...new Set(edges.flatMap(({ from, to }) => [from, to]))];
	return {
		nodes: nodeIds.map((id) => ({
			id,
			name: id.toUpperCase(),
			type: id === 'trigger' ? 'trigger' : 'v1-node',
		})),
		edges: edges.map((edge) => ({ outputIndex: 0, inputIndex: 0, ...edge })),
	};
}

/** trigger -> if -> {a (out 0), b (out 1)} -> m: the conditional diamond. */
const diamond = makeGraph([
	{ from: 'trigger', to: 'if' },
	{ from: 'if', to: 'a', outputIndex: 0 },
	{ from: 'if', to: 'b', outputIndex: 1 },
	{ from: 'a', to: 'm', inputIndex: 0 },
	{ from: 'b', to: 'm', inputIndex: 1 },
]);

describe('decideSuccessors', () => {
	it('queues the live branch and skips the dead one', () => {
		// if fired only output slot 0; m is not a direct successor, so it is
		// not considered — b's own settled event will examine it.
		const decisions = decideLoopless(
			diamond,
			keyFor('if'),
			makeSteps(summary('trigger', 'completed', [true]), summary('if', 'completed', [true, false])),
		);

		expect(decisions).toEqual({ toQueue: [keyFor('a')], toSkip: [keyFor('b')] });
	});

	it('decides a merge once its last predecessor settles', () => {
		// b was skipped earlier; a just completed. m has one live and one dead
		// edge, so it runs on the live data.
		const decisions = decideLoopless(
			diamond,
			keyFor('a'),
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('if', 'completed', [true, false]),
				summary('a', 'completed', [true]),
				summary('b', 'skipped'),
			),
		);

		expect(decisions).toEqual({ toQueue: [keyFor('m')], toSkip: [] });
	});

	it('leaves a merge undecided while a predecessor is still unsettled', () => {
		// b's settled event fires while a is still queued: m is not decidable
		// yet, and a's own settlement will decide it later.
		const decisions = decideLoopless(
			diamond,
			keyFor('b'),
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('if', 'completed', [true, false]),
				summary('a', 'queued'),
				summary('b', 'skipped'),
			),
		);

		expect(decisions).toEqual({ toQueue: [], toSkip: [] });
	});

	it('cascades a skip one hop at a time through the event loop', () => {
		// dead chain b -> c -> d: each settled event plans exactly the next hop.
		const graph = makeGraph([
			{ from: 'trigger', to: 'if' },
			{ from: 'if', to: 'a', outputIndex: 0 },
			{ from: 'if', to: 'b', outputIndex: 1 },
			{ from: 'b', to: 'c' },
			{ from: 'c', to: 'd' },
		]);
		const steps = makeSteps(
			summary('trigger', 'completed', [true]),
			summary('if', 'completed', [true, false]),
		);

		expect(decideLoopless(graph, keyFor('if'), steps)).toEqual({
			toQueue: [keyFor('a')],
			toSkip: [keyFor('b')],
		});

		steps[stepKeyId(keyFor('b'))] = summary('b', 'skipped');
		expect(decideLoopless(graph, keyFor('b'), steps)).toEqual({
			toQueue: [],
			toSkip: [keyFor('c')],
		});

		steps[stepKeyId(keyFor('c'))] = summary('c', 'skipped');
		expect(decideLoopless(graph, keyFor('c'), steps)).toEqual({
			toQueue: [],
			toSkip: [keyFor('d')],
		});
	});

	it('skips a node only when every predecessor has settled dead', () => {
		// d sits behind both b and c. When b's skip settles first, d must wait
		// for c rather than being skipped early.
		const graph = makeGraph([
			{ from: 'trigger', to: 'if' },
			{ from: 'if', to: 'a', outputIndex: 0 },
			{ from: 'if', to: 'b', outputIndex: 1 },
			{ from: 'if', to: 'c', outputIndex: 1 },
			{ from: 'b', to: 'd', inputIndex: 0 },
			{ from: 'c', to: 'd', inputIndex: 1 },
		]);
		const steps = makeSteps(
			summary('trigger', 'completed', [true]),
			summary('if', 'completed', [true, false]),
			summary('b', 'skipped'),
		);

		expect(decideLoopless(graph, keyFor('b'), steps)).toEqual({ toQueue: [], toSkip: [] });

		steps[stepKeyId(keyFor('c'))] = summary('c', 'skipped');
		expect(decideLoopless(graph, keyFor('c'), steps)).toEqual({
			toQueue: [],
			toSkip: [keyFor('d')],
		});
	});

	it('does not re-decide a successor that already has a row', () => {
		// duplicate delivery: both successors were planned by the first run.
		// Nothing is created, so nothing is announced — a lost announcement is
		// reconciliation's job (CAT-2938), not this planner's.
		const decisions = decideLoopless(
			diamond,
			keyFor('if'),
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('if', 'completed', [true, false]),
				summary('a', 'queued'),
				summary('b', 'skipped'),
			),
		);

		expect(decisions).toEqual({ toQueue: [], toSkip: [] });
	});

	it('routes an N-output fan-out per slot', () => {
		const graph = makeGraph([
			{ from: 'trigger', to: 'switch' },
			{ from: 'switch', to: 'a', outputIndex: 0 },
			{ from: 'switch', to: 'b', outputIndex: 1 },
			{ from: 'switch', to: 'c', outputIndex: 2 },
		]);

		const decisions = decideLoopless(
			graph,
			keyFor('switch'),
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('switch', 'completed', [true, false, true]),
			),
		);

		expect(decisions).toEqual({ toQueue: [keyFor('a'), keyFor('c')], toSkip: [keyFor('b')] });
	});

	it('treats an output slot beyond the produced list as dead', () => {
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'b', outputIndex: 1 },
		]);

		const decisions = decideLoopless(
			graph,
			keyFor('a'),
			makeSteps(summary('trigger', 'completed', [true]), summary('a', 'completed', [true])),
		);

		expect(decisions).toEqual({ toQueue: [], toSkip: [keyFor('b')] });
	});
});

/**
 * Property test: the cascade is the event loop, so correctness is a property
 * of the whole loop, not one call. The simulation below models the engine —
 * a FIFO settlement queue, steps completing in arbitrary order relative to
 * event handling — using `decideSuccessors` as the only decision logic. Its
 * terminal state must match an independent whole-graph evaluation of the
 * three-rule spec, and must satisfy rule 1: every reachable node settled.
 */

/** Deterministic PRNG so failures reproduce from the logged seed. */
function lcg(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

function randomInt(rand: () => number, bound: number): number {
	return Math.floor(rand() * bound);
}

function randomDag(rand: () => number): WorkflowGraph {
	const count = 3 + randomInt(rand, 6);
	const edges: GraphEdge[] = [];
	for (let i = 0; i < count; i++) {
		const to = `n${i}`;
		const candidates = ['trigger', ...Array.from({ length: i }, (_, j) => `n${j}`)];
		const predecessorCount = Math.min(candidates.length, 1 + randomInt(rand, 2));
		// distinct predecessors, one edge per input slot (the validated shape)
		const shuffled = [...candidates].sort(() => rand() - 0.5);
		for (let slot = 0; slot < predecessorCount; slot++) {
			edges.push({
				from: shuffled[slot],
				to,
				outputIndex: randomInt(rand, 2),
				inputIndex: slot,
			});
		}
	}
	return makeGraph(edges);
}

/** Fixed per-node outputs so the simulation and the reference agree on data. */
function makeOutputs(graph: WorkflowGraph, rand: () => number): Record<string, boolean[]> {
	return Object.fromEntries(
		graph.nodes.map(({ id }) => [id, id === 'trigger' ? [true] : [rand() < 0.7, rand() < 0.3]]),
	);
}

/**
 * Runs the engine's event loop in miniature: settled events are handled FIFO
 * (the orchestration queue is a single sequential consumer), while queued
 * steps complete at arbitrary points in between (the step workers).
 */
function simulateExecution(
	graph: WorkflowGraph,
	outputs: Record<string, boolean[]>,
	rand: () => number,
): Record<string, StepSummary> {
	const steps = makeSteps(summary('trigger', 'completed', outputs.trigger));
	const settledEvents = ['trigger'];
	const queuedNodes: string[] = [];

	while (settledEvents.length > 0 || queuedNodes.length > 0) {
		const handleEvent = settledEvents.length > 0 && (queuedNodes.length === 0 || rand() < 0.5);
		if (handleEvent) {
			const nodeId = settledEvents[0];
			settledEvents.shift();
			const { toQueue, toSkip } = decideLoopless(graph, keyFor(nodeId), steps);
			for (const { nodeId: id } of toQueue) {
				steps[stepKeyId(keyFor(id))] = summary(id, 'queued');
				queuedNodes.push(id);
			}
			for (const { nodeId: id } of toSkip) {
				steps[stepKeyId(keyFor(id))] = summary(id, 'skipped');
				settledEvents.push(id);
			}
		} else {
			const [nodeId] = queuedNodes.splice(randomInt(rand, queuedNodes.length), 1);
			steps[stepKeyId(keyFor(nodeId))] = summary(nodeId, 'completed', outputs[nodeId]);
			settledEvents.push(nodeId);
		}
	}
	return steps;
}

/** The three-rule spec, evaluated by whole-graph fixpoint over `outputs`. */
function referenceTerminalState(
	graph: WorkflowGraph,
	outputs: Record<string, boolean[]>,
): Record<string, StepStatus> {
	const statuses: Record<string, StepStatus> = { trigger: 'completed' };
	const isLive = (edge: GraphEdge): boolean =>
		statuses[edge.from] === 'completed' && Boolean(outputs[edge.from][edge.outputIndex]);

	let changed = true;
	while (changed) {
		changed = false;
		for (const node of graph.nodes) {
			if (statuses[node.id]) continue;
			const incoming = graph.edges.filter((edge) => edge.to === node.id && !edge.isBackEdge);
			if (incoming.length === 0) continue;
			if (!incoming.every(({ from }) => statuses[from])) continue;
			statuses[node.id] = incoming.some(isLive) ? 'completed' : 'skipped';
			changed = true;
		}
	}
	return statuses;
}

describe('the event loop over decideSuccessors matches the reference evaluator', () => {
	it('settles every reachable node with the spec fate, on 200 random DAGs', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const rand = lcg(seed);
			const graph = randomDag(rand);
			const outputs = makeOutputs(graph, rand);

			const terminal = simulateExecution(graph, outputs, rand);
			const expected = referenceTerminalState(graph, outputs);

			const reachable = ['trigger', ...getDescendantNodeIds(graph, 'trigger')];
			const actual = Object.fromEntries(
				reachable.map((id) => [id, terminal[stepKeyId(keyFor(id))]?.status ?? 'missing']),
			);
			// rule 1 (the finish predicate): every reachable node settled, and
			// with exactly the fate the spec assigns
			expect({ seed, statuses: actual }).toEqual({ seed, statuses: expected });
		}
	});
});

describe('decideSuccessors over loop iterations', () => {
	/**
	 * ┌───────┐    ┌───┐ o0    ┌───┐
	 * │trigger├───►│   ├──────►│ d │
	 * └───────┘    │ B │       └───┘
	 *              │   │ o1    ┌───┐
	 *              │   ├──────►│ x │
	 *              └─▲─┘       └─┬─┘
	 *                └──(back)───┘
	 */
	const graph = makeGraph([
		{ from: 'trigger', to: 'B' },
		{ from: 'B', to: 'x', outputIndex: 1 },
		{ from: 'x', to: 'B', isBackEdge: true },
		{ from: 'B', to: 'd', outputIndex: 0 },
	]);
	graph.nodes = graph.nodes.map((node) =>
		node.id === 'B' ? { ...node, type: 'batch' as const } : node,
	);
	const loops = deriveLoops(graph);

	/** A row at a given iteration, where the loopless `summary` always builds 0. */
	function at(
		nodeId: string,
		iteration: number,
		status: StepStatus,
		filledOutputSlots: boolean[] = [],
	): StepSummary {
		return { id: `step-${nodeId}-${iteration}`, nodeId, iteration, status, filledOutputSlots };
	}

	function decide(
		settled: StepKey,
		steps: Record<string, StepSummary>,
		terminalIterations: Map<string, number> = new Map(),
	): SuccessorDecisions {
		return decideSuccessors(graph, loops, settled, steps, terminalIterations);
	}

	const key = (nodeId: string, iteration: number): StepKey => ({ nodeId, iteration });

	it('queues the body at the batch row iteration, and leaves the exit undecided', () => {
		// B filled its loop slot, so the loop runs on and its end is unknown
		const steps = makeSteps(at('B', 0, 'completed', [false, true]));

		expect(decide(key('B', 0), steps)).toEqual({ toQueue: [key('x', 0)], toSkip: [] });
	});

	it('advances the iteration across the return edge', () => {
		const steps = makeSteps(
			at('B', 0, 'completed', [false, true]),
			at('x', 0, 'completed', [true]),
		);

		expect(decide(key('x', 0), steps)).toEqual({ toQueue: [key('B', 1)], toSkip: [] });
	});

	it('skips the next iteration when the body returns nothing', () => {
		// a dead return edge ends the loop: (B, 1) is skipped at birth, and skipped
		// rows fire nothing, which makes it the terminal row
		const steps = makeSteps(
			at('B', 0, 'completed', [false, true]),
			at('x', 0, 'completed', [false]),
		);

		expect(decide(key('x', 0), steps)).toEqual({ toQueue: [], toSkip: [key('B', 1)] });
	});

	it('queues what follows the loop from the terminal row only', () => {
		// B filled its done slot instead, so the loop has ended at iteration 2
		const steps = makeSteps(at('B', 2, 'completed', [true, false]));
		const terminals = new Map([['B', 2]]);

		expect(decide(key('B', 2), steps, terminals)).toEqual({
			toQueue: [key('d', 0)],
			toSkip: [],
		});
	});

	it('plans no body row at the terminal iteration', () => {
		// the cascade this prevents: a skipped body row would settle, its return edge
		// would plan another batch row, and that row would end the loop in turn
		const steps = makeSteps(at('B', 2, 'completed', [true, false]));
		const terminals = new Map([['B', 2]]);

		const decisions = decide(key('B', 2), steps, terminals);

		expect(decisions.toQueue).not.toContainEqual(key('x', 2));
		expect(decisions.toSkip).not.toContainEqual(key('x', 2));
	});

	it('leaves what follows the loop undecided while the loop still runs', () => {
		// B@1 has a dead done slot, and d is not skipped on the strength of it: an
		// empty toSkip is the assertion, since a later row may still fire that slot
		const steps = makeSteps(
			at('B', 0, 'completed', [false, true]),
			at('x', 0, 'completed', [true]),
			at('B', 1, 'completed', [false, true]),
		);

		expect(decide(key('B', 1), steps)).toEqual({ toQueue: [key('x', 1)], toSkip: [] });
	});

	/**
	 * The rule above keeps a running loop from deciding its exit, but a node after
	 * the loop can also be reached from outside it. Then the exit edge is resolved
	 * for real, finds no terminal row, and holds the decision open.
	 *
	 * ┌───────┐    ┌───┐ o1    ┌───┐
	 * │trigger├───►│ B ├──────►│ x │
	 * └───┬───┘    └─▲─┘       └─┬─┘
	 *     │          └──(back)───┘
	 *     │       ┌───┐ o0
	 *     └──────►│ p ├──────────► d ◄── B's done slot
	 *             └───┘
	 */
	it('holds a node after the loop undecided when another predecessor settles first', () => {
		const joined = makeGraph([
			{ from: 'trigger', to: 'B' },
			{ from: 'B', to: 'x', outputIndex: 1 },
			{ from: 'x', to: 'B', isBackEdge: true },
			{ from: 'B', to: 'd', outputIndex: 0 },
			{ from: 'trigger', to: 'p', outputIndex: 1 },
			{ from: 'p', to: 'd', inputIndex: 1 },
		]);
		joined.nodes = joined.nodes.map((node) =>
			node.id === 'B' ? { ...node, type: 'batch' as const } : node,
		);
		const joinedLoops = deriveLoops(joined);
		const steps = makeSteps(
			at('B', 0, 'completed', [false, true]),
			at('p', 0, 'completed', [true]),
		);

		// p settling makes d a candidate, but the loop has not ended, so the exit
		// edge has no row to read and d gets no fate at all
		expect(decideSuccessors(joined, joinedLoops, key('p', 0), steps, new Map())).toEqual({
			toQueue: [],
			toSkip: [],
		});

		// once it has ended, the same settlement queues d
		const ended = makeSteps(
			at('B', 2, 'completed', [true, false]),
			at('p', 0, 'completed', [true]),
		);
		expect(decideSuccessors(joined, joinedLoops, key('p', 0), ended, new Map([['B', 2]]))).toEqual({
			toQueue: [key('d', 0)],
			toSkip: [],
		});
	});

	it('reads the entry edge at iteration 0 and the return edge after it', () => {
		const entry = makeSteps(at('trigger', 0, 'completed', [true]));
		expect(decide(key('trigger', 0), entry)).toEqual({ toQueue: [key('B', 0)], toSkip: [] });

		// at iteration 1 the entry edge connects nothing, so the return edge alone
		// decides, and B is queued on its strength
		const second = makeSteps(
			at('trigger', 0, 'completed', [true]),
			at('B', 0, 'completed', [false, true]),
			at('x', 0, 'completed', [true]),
		);
		expect(decide(key('x', 0), second)).toEqual({ toQueue: [key('B', 1)], toSkip: [] });
	});
});
