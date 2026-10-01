/**
 * Prototype: loop frames, so loops can nest.
 *
 * The engine keys a step by `(nodeId, iteration)` and derives loops from the strongly
 * connected component of a batch node. A loop inside a loop lands in one component, so
 * `validateLoops` rejects it. A loop frame is an explicit node group: one batch node and
 * the nodes of its body. Frames nest. A step is keyed by `(nodeId, path)`, where `path`
 * holds one pass number for each frame around the node, outermost first. Each pass of an
 * outer frame so gets a new ledger for every inner frame.
 *
 * Nothing in the default engine calls this module. `validateLoops` and the planner are
 * unchanged. See `run-loop-frames.ts` for an in-memory runner of the same rules.
 */
import {
	GraphValidationError,
	isBatchStepConfig,
	type GraphEdge,
	type WorkflowGraph,
} from '../graph';

/** A loop region: its batch node and every node of its body, including nested frames. */
export interface LoopFrame {
	readonly id: string;
	readonly batchNodeId: string;
	readonly nodeIds: readonly string[];
}

/** One pass number per frame around a node, outermost first. */
export type FramePath = readonly number[];

export interface FrameKey {
	readonly nodeId: string;
	readonly path: FramePath;
}

export const frameKeyId = ({ nodeId, path }: FrameKey) => `${nodeId}@${path.join('.')}`;

/**
 * How an edge maps the path of its source step to the path of its target step:
 *
 * - `intra`: both ends in the same frames. Same path.
 * - `back`: the return into a batch node. Pass `i` feeds pass `i + 1`.
 * - `entry`: into a batch node from the frame around it. The target path adds pass 0.
 * - `exit`: from the done slot of a batch node to the frame around it. The source is the
 *   terminal pass, and the target path drops that pass.
 */
export type FrameEdgeClass = 'intra' | 'back' | 'entry' | 'exit';

export interface FrameTree {
	readonly frames: readonly LoopFrame[];
	/** The frames that hold `nodeId`, outermost first. */
	chainOf(nodeId: string): readonly LoopFrame[];
	frameOfBatch(nodeId: string): LoopFrame | undefined;
	classify(edge: GraphEdge): FrameEdgeClass;
}

export const DONE_SLOT = 0;
export const LOOP_SLOT = 1;

const sameChain = (a: readonly LoopFrame[], b: readonly LoopFrame[]) =>
	a.length === b.length && a.every((frame, index) => frame === b[index]);

const extends1 = (outer: readonly LoopFrame[], inner: readonly LoopFrame[]) =>
	inner.length === outer.length + 1 && outer.every((frame, index) => frame === inner[index]);

/**
 * Checks the frames against the graph, and gives the frame tree the runner reads.
 *
 * 1. Each frame holds its batch node, and each batch node heads one frame.
 * 2. Two frames are nested or disjoint.
 * 3. Each edge stays in its frames, enters a frame at its batch node (slot 0), leaves a
 *    frame from the done slot of its batch node, or is the one marked return of a frame.
 * 4. Without the returns, the graph has no cycle.
 * 5. No trigger sits in a frame.
 */
export function validateLoopFrames(graph: WorkflowGraph, frames: readonly LoopFrame[]): FrameTree {
	const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
	const name = (id: string) => nodes.get(id)?.name ?? id;
	const memberSets = new Map(frames.map((frame) => [frame, new Set(frame.nodeIds)]));

	for (const frame of frames) {
		const batch = nodes.get(frame.batchNodeId);
		if (batch?.type !== 'batch' || !isBatchStepConfig(batch.config)) {
			throw new GraphValidationError(
				`Frame ${frame.id} is headed by ${name(frame.batchNodeId)}, which is not a batch node with a batch size`,
			);
		}
		if (!memberSets.get(frame)?.has(frame.batchNodeId)) {
			throw new GraphValidationError(`Frame ${frame.id} does not hold its batch node`);
		}
		for (const id of frame.nodeIds) {
			if (!nodes.has(id))
				throw new GraphValidationError(`Frame ${frame.id} holds unknown node ${id}`);
			if (nodes.get(id)?.type === 'trigger') {
				throw new GraphValidationError(`Trigger ${name(id)} is inside frame ${frame.id}`);
			}
		}
	}
	for (const node of graph.nodes.filter((each) => each.type === 'batch')) {
		const heads = frames.filter((frame) => frame.batchNodeId === node.id);
		if (heads.length !== 1) {
			throw new GraphValidationError(
				`Batch node ${node.name} heads ${heads.length} frames; it must head exactly one`,
			);
		}
	}
	for (const a of frames) {
		for (const b of frames.filter((other) => other !== a)) {
			const inB = memberSets.get(b) ?? new Set<string>();
			const shared = a.nodeIds.filter((id) => inB.has(id)).length;
			if (shared > 0 && shared !== a.nodeIds.length && shared !== b.nodeIds.length) {
				throw new GraphValidationError(`Frames ${a.id} and ${b.id} overlap without nesting`);
			}
			if (shared === a.nodeIds.length && shared === b.nodeIds.length) {
				throw new GraphValidationError(`Frames ${a.id} and ${b.id} hold the same nodes`);
			}
		}
	}

	const chains = new Map(
		graph.nodes.map((node) => [
			node.id,
			frames
				.filter((frame) => memberSets.get(frame)?.has(node.id))
				.sort((a, b) => b.nodeIds.length - a.nodeIds.length),
		]),
	);
	const chainOf = (id: string) => chains.get(id) ?? [];
	const frameOfBatch = (id: string) => frames.find((frame) => frame.batchNodeId === id);

	const classify = (edge: GraphEdge): FrameEdgeClass => {
		const from = chainOf(edge.from);
		const to = chainOf(edge.to);
		const target = frameOfBatch(edge.to);
		const source = frameOfBatch(edge.from);
		const describe = `Edge ${name(edge.from)} -> ${name(edge.to)}`;
		if (edge.isBackEdge) {
			if (!target || to.at(-1) !== target || !sameChain(from, to) || edge.inputIndex !== 0) {
				throw new GraphValidationError(
					`${describe} is a return, but does not run from inside a frame to slot 0 of its batch node`,
				);
			}
			return 'back';
		}
		if (sameChain(from, to)) {
			if (target && to.at(-1) === target) {
				throw new GraphValidationError(`${describe} returns into its frame without a return mark`);
			}
			if (source && edge.outputIndex === DONE_SLOT && from.at(-1) === source) {
				throw new GraphValidationError(`${describe} runs the done slot into its own frame`);
			}
			return 'intra';
		}
		if (target && extends1(from, to) && to.at(-1) === target && edge.inputIndex === 0) {
			return 'entry';
		}
		if (source && extends1(to, from) && from.at(-1) === source && edge.outputIndex === DONE_SLOT) {
			return 'exit';
		}
		throw new GraphValidationError(
			`${describe} crosses a frame boundary; edges enter a frame at its batch node and leave from its done slot`,
		);
	};

	const classes = graph.edges.map((edge) => ({ edge, kind: classify(edge) }));
	for (const frame of frames) {
		const bounded: readonly FrameEdgeClass[] = ['back', 'entry'];
		for (const kind of bounded) {
			const count = classes.filter(
				(each) => each.kind === kind && each.edge.to === frame.batchNodeId,
			).length;
			if (count !== 1) {
				throw new GraphValidationError(
					`Frame ${frame.id} has ${count} ${kind} edges; the prototype supports exactly one`,
				);
			}
		}
	}
	assertAcyclic(
		graph,
		classes.filter(({ kind }) => kind !== 'back').map(({ edge }) => edge),
		name,
	);

	return { frames, chainOf, frameOfBatch, classify };
}

function assertAcyclic(
	graph: WorkflowGraph,
	edges: readonly GraphEdge[],
	name: (id: string) => string,
): void {
	const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
	for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
	const ready = [...indegree].filter(([, count]) => count === 0).map(([id]) => id);
	const visited = new Set<string>();
	while (ready.length > 0) {
		const id = ready.pop();
		if (id === undefined) break;
		visited.add(id);
		for (const edge of edges.filter((each) => each.from === id)) {
			const left = (indegree.get(edge.to) ?? 0) - 1;
			indegree.set(edge.to, left);
			if (left === 0) ready.push(edge.to);
		}
	}
	const cyclic = graph.nodes.filter((node) => !visited.has(node.id));
	if (cyclic.length > 0) {
		throw new GraphValidationError(
			`Nodes ${cyclic.map((node) => name(node.id)).join(', ')} form a cycle without a marked return`,
		);
	}
}

/** The target path of an edge, given its source path. */
export function targetPath(kind: FrameEdgeClass, source: FramePath): FramePath {
	switch (kind) {
		case 'back':
			return [...source.slice(0, -1), (source.at(-1) ?? 0) + 1];
		case 'entry':
			return [...source, 0];
		case 'exit':
			return source.slice(0, -1);
		case 'intra':
			return source;
	}
}

/**
 * The source path an edge reads for a target path. `none`: the edge connects nothing there.
 * `pending`: the source is a terminal pass that has not happened yet.
 */
export function sourcePath(
	kind: FrameEdgeClass,
	target: FramePath,
	terminalPass: number | undefined,
): { kind: 'path'; path: FramePath } | { kind: 'none' } | { kind: 'pending' } {
	const last = target.at(-1) ?? 0;
	switch (kind) {
		case 'back':
			return last === 0
				? { kind: 'none' }
				: { kind: 'path', path: [...target.slice(0, -1), last - 1] };
		case 'entry':
			return last > 0 ? { kind: 'none' } : { kind: 'path', path: target.slice(0, -1) };
		case 'exit':
			return terminalPass === undefined
				? { kind: 'pending' }
				: { kind: 'path', path: [...target, terminalPass] };
		case 'intra':
			return { kind: 'path', path: target };
	}
}
