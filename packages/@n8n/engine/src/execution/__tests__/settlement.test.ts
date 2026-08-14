import { describe, expect, it } from 'vitest';

import type { GraphEdge, WorkflowGraph } from '../../graph';
import { getDescendantNodeIds } from '../../graph';
import type { StepStatus } from '../execution.types';
import { decideSuccessors } from '../settlement';
import type { StepSummary } from '../step-store';

function summary(
	nodeId: string,
	status: StepStatus,
	filledOutputSlots: boolean[] = [],
): StepSummary {
	return { id: `step-${nodeId}`, nodeId, status, filledOutputSlots };
}

function makeSteps(...summaries: StepSummary[]): Record<string, StepSummary> {
	return Object.fromEntries(summaries.map((s) => [s.nodeId, s]));
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

/** trigger → if → {a (out 0), b (out 1)} → m: the conditional diamond. */
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
		const decisions = decideSuccessors(
			diamond,
			'if',
			makeSteps(summary('trigger', 'completed', [true]), summary('if', 'completed', [true, false])),
		);

		expect(decisions).toEqual({ toQueue: ['a'], toSkip: ['b'] });
	});

	it('decides a merge once its last predecessor settles', () => {
		// b was skipped earlier; a just completed. m has one live and one dead
		// edge, so it runs on the live data.
		const decisions = decideSuccessors(
			diamond,
			'a',
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('if', 'completed', [true, false]),
				summary('a', 'completed', [true]),
				summary('b', 'skipped'),
			),
		);

		expect(decisions).toEqual({ toQueue: ['m'], toSkip: [] });
	});

	it('leaves a merge undecided while a predecessor is still unsettled', () => {
		// b's settled event fires while a is still queued: m is not decidable
		// yet, and a's own settlement will decide it later.
		const decisions = decideSuccessors(
			diamond,
			'b',
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
		// dead chain b → c → d: each settled event plans exactly the next hop.
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

		expect(decideSuccessors(graph, 'if', steps)).toEqual({ toQueue: ['a'], toSkip: ['b'] });

		steps.b = summary('b', 'skipped');
		expect(decideSuccessors(graph, 'b', steps)).toEqual({ toQueue: [], toSkip: ['c'] });

		steps.c = summary('c', 'skipped');
		expect(decideSuccessors(graph, 'c', steps)).toEqual({ toQueue: [], toSkip: ['d'] });
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

		expect(decideSuccessors(graph, 'b', steps)).toEqual({ toQueue: [], toSkip: [] });

		steps.c = summary('c', 'skipped');
		expect(decideSuccessors(graph, 'c', steps)).toEqual({ toQueue: [], toSkip: ['d'] });
	});

	it('does not re-decide a successor that already has a row', () => {
		// duplicate delivery: both successors were planned by the first run.
		// Nothing is created, so nothing is announced — a lost announcement is
		// reconciliation's job (CAT-2938), not this planner's.
		const decisions = decideSuccessors(
			diamond,
			'if',
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

		const decisions = decideSuccessors(
			graph,
			'switch',
			makeSteps(
				summary('trigger', 'completed', [true]),
				summary('switch', 'completed', [true, false, true]),
			),
		);

		expect(decisions).toEqual({ toQueue: ['a', 'c'], toSkip: ['b'] });
	});

	it('treats an output slot beyond the produced list as dead', () => {
		const graph = makeGraph([
			{ from: 'trigger', to: 'a' },
			{ from: 'a', to: 'b', outputIndex: 1 },
		]);

		const decisions = decideSuccessors(
			graph,
			'a',
			makeSteps(summary('trigger', 'completed', [true]), summary('a', 'completed', [true])),
		);

		expect(decisions).toEqual({ toQueue: [], toSkip: ['b'] });
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
			const { toQueue, toSkip } = decideSuccessors(graph, nodeId, steps);
			for (const id of toQueue) {
				steps[id] = summary(id, 'queued');
				queuedNodes.push(id);
			}
			for (const id of toSkip) {
				steps[id] = summary(id, 'skipped');
				settledEvents.push(id);
			}
		} else {
			const [nodeId] = queuedNodes.splice(randomInt(rand, queuedNodes.length), 1);
			steps[nodeId] = summary(nodeId, 'completed', outputs[nodeId]);
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
				reachable.map((id) => [id, terminal[id]?.status ?? 'missing']),
			);
			// rule 1 (the finish predicate): every reachable node settled, and
			// with exactly the fate the spec assigns
			expect({ seed, statuses: actual }).toEqual({ seed, statuses: expected });
		}
	});
});
