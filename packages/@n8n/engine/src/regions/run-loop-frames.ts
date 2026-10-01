/**
 * Prototype: an in-memory runner for loop frames. It applies the settlement rules of
 * `execution/settlement.ts` to steps keyed by `(nodeId, path)`, and runs batch nodes with
 * the engine's own `runBatchStep`. It has no store and no queue: it shows the rules, so a
 * test can check nested loops before the step store learns frame paths.
 */
import { UnexpectedError, type JsonValue } from '../common';
import type { GraphEdge, GraphNode, WorkflowGraph } from '../graph';
import { isBatchStepConfig } from '../graph';
import { runBatchStep } from '../execution/batch-step';
import type { StepSlots } from '../execution/execution.types';
import {
	frameKeyId,
	LOOP_SLOT,
	sourcePath,
	targetPath,
	validateLoopFrames,
	type FrameKey,
	type FramePath,
	type FrameTree,
	type LoopFrame,
} from './loop-frames';

/** Runs one step of a node that is not a batch node. `path` holds the pass of each frame. */
export type FrameStepExecutor = (
	node: GraphNode,
	inputs: StepSlots,
	path: FramePath,
) => Promise<StepSlots>;

export interface FrameStep {
	readonly key: FrameKey;
	readonly status: 'completed' | 'skipped';
	readonly outputs: StepSlots;
}

/** Every step in the order it settled. */
export interface FrameRun {
	readonly steps: readonly FrameStep[];
	step(nodeId: string, path: FramePath): FrameStep | undefined;
}

/** Bounds a run, so a graph the rules accept but that never ends cannot hang a test. */
const MAX_STEPS = 10_000;

const isTerminal = (step: FrameStep) => !step.outputs[LOOP_SLOT];

export async function runLoopFrames(
	graph: WorkflowGraph,
	frames: readonly LoopFrame[],
	triggerOutputs: StepSlots,
	execute: FrameStepExecutor,
): Promise<FrameRun> {
	const tree = validateLoopFrames(graph, frames);
	const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
	const settled = new Map<string, FrameStep>();
	const order: FrameStep[] = [];
	const queue: FrameKey[] = [];
	const at = (nodeId: string, path: FramePath) => settled.get(frameKeyId({ nodeId, path }));

	/** The pass that ended the frame of batch node `batchNodeId` inside `parent`. */
	const terminalPass = (batchNodeId: string, parent: FramePath): number | undefined =>
		order
			.find(
				(step) =>
					step.key.nodeId === batchNodeId &&
					step.key.path.length === parent.length + 1 &&
					parent.every((pass, index) => step.key.path[index] === pass) &&
					isTerminal(step),
			)
			?.key.path.at(-1);

	function settle(step: FrameStep) {
		settled.set(frameKeyId(step.key), step);
		order.push(step);
		decideSuccessors(step);
	}

	/** Settlement rule 3 with frames: queued, skipped, undecidable, or outside. */
	function decideFate(target: FrameKey) {
		if (isPastFrameEnd(tree, target, at)) return 'outside';
		const reads = readsOf(graph, tree, target, terminalPass);
		if (reads === 'pending') return 'undecidable';
		if (reads.length === 0) return 'outside';
		const sources = reads.map(({ edge, path }) => ({ edge, step: at(edge.from, path) }));
		if (sources.some(({ step }) => step === undefined)) return 'undecidable';
		const live = sources.some(
			({ edge, step }) => step?.status === 'completed' && Boolean(step.outputs[edge.outputIndex]),
		);
		return live ? 'queued' : 'skipped';
	}

	/** Settlement rules 2 to 4: decide the direct successors; a skip cascades at once. */
	function decideSuccessors(step: FrameStep) {
		const batch = tree.frameOfBatch(step.key.nodeId);
		for (const edge of graph.edges.filter((each) => each.from === step.key.nodeId)) {
			const kind = tree.classify(edge);
			// A batch step decides the body while its loop runs, and what follows once it ends.
			if (batch && (kind === 'exit') !== isTerminal(step)) continue;
			const target = { nodeId: edge.to, path: targetPath(kind, step.key.path) };
			const id = frameKeyId(target);
			if (settled.has(id) || queue.some((key) => frameKeyId(key) === id)) continue;
			const fate = decideFate(target);
			if (fate === 'queued') queue.push(target);
			if (fate === 'skipped') settle({ key: target, status: 'skipped', outputs: [] });
		}
	}

	const runStep = async (key: FrameKey): Promise<StepSlots> => {
		const node = nodes.get(key.nodeId);
		if (!node) throw new UnexpectedError(`no node ${key.nodeId}`);
		const frame = tree.frameOfBatch(key.nodeId);
		if (!frame || !isBatchStepConfig(node.config)) {
			return await execute(node, gatherInputs(graph, tree, key, terminalPass, at), key.path);
		}
		const outputs = await runBatchStep(node.config, key.path.at(-1) ?? 0, {
			readOriginalItems: async () => entryItems(graph, tree, frame, key, at),
			readArrivals: async (pass) => arrivals(graph, tree, frame, key.path.slice(0, -1), pass, at),
		});
		// An empty inner loop still ends its pass with `done`, or the outer pass never returns.
		const nested = tree.chainOf(key.nodeId).length > 1;
		return nested && outputs.every((slot) => slot === null) ? [[], null] : outputs;
	};

	const trigger = graph.nodes.find((node) => node.type === 'trigger');
	if (!trigger) throw new UnexpectedError('the graph has no trigger');
	settle({ key: { nodeId: trigger.id, path: [] }, status: 'completed', outputs: triggerOutputs });

	while (queue.length > 0) {
		if (order.length > MAX_STEPS) throw new UnexpectedError(`more than ${MAX_STEPS} steps`);
		const key = queue.shift();
		if (key) settle({ key, status: 'completed', outputs: await runStep(key) });
	}

	return { steps: order, step: at };
}

type Lookup = (nodeId: string, path: FramePath) => FrameStep | undefined;
type TerminalPass = (batchNodeId: string, parent: FramePath) => number | undefined;

/** A body step of a frame whose batch step at that pass ended the frame never exists. */
function isPastFrameEnd(tree: FrameTree, target: FrameKey, at: Lookup): boolean {
	return tree.chainOf(target.nodeId).some((frame, level) => {
		if (frame.batchNodeId === target.nodeId && level === target.path.length - 1) return false;
		const batch = at(frame.batchNodeId, target.path.slice(0, level + 1));
		return batch !== undefined && isTerminal(batch);
	});
}

/** The edges into `target` that connect at its path, with the source path of each. */
function readsOf(
	graph: WorkflowGraph,
	tree: FrameTree,
	target: FrameKey,
	terminalPass: TerminalPass,
): Array<{ edge: GraphEdge; path: FramePath }> | 'pending' {
	const reads = graph.edges
		.filter((edge) => edge.to === target.nodeId)
		.map((edge) => {
			const kind = tree.classify(edge);
			const terminal = kind === 'exit' ? terminalPass(edge.from, target.path) : undefined;
			return { edge, source: sourcePath(kind, target.path, terminal) };
		});
	if (reads.some(({ source }) => source.kind === 'pending')) return 'pending';
	return reads.flatMap(({ edge, source }) =>
		source.kind === 'path' ? [{ edge, path: source.path }] : [],
	);
}

/** Inputs by slot. Two live edges into one slot concatenate their lists. */
function gatherInputs(
	graph: WorkflowGraph,
	tree: FrameTree,
	key: FrameKey,
	terminalPass: TerminalPass,
	at: Lookup,
): StepSlots {
	const reads = readsOf(graph, tree, key, terminalPass);
	if (reads === 'pending')
		throw new UnexpectedError(`step ${frameKeyId(key)} ran before its inputs`);
	const values = reads.map(({ edge, path }) => ({
		slot: edge.inputIndex,
		value: at(edge.from, path)?.outputs[edge.outputIndex] ?? null,
	}));
	const slots = Math.max(0, ...values.map(({ slot }) => slot + 1));
	return Array.from({ length: slots }, (_, slot) => {
		const lists = values.filter((each) => each.slot === slot && Array.isArray(each.value));
		return lists.length === 0 ? null : lists.flatMap(({ value }) => asList(value));
	});
}

const asList = (value: JsonValue): JsonValue[] => (Array.isArray(value) ? value : []);

/** What the frame works through in this pass of its parent: its entry edge's source. */
function entryItems(
	graph: WorkflowGraph,
	tree: FrameTree,
	frame: LoopFrame,
	key: FrameKey,
	at: Lookup,
): JsonValue {
	const entry = graph.edges.find(
		(edge) => edge.to === frame.batchNodeId && tree.classify(edge) === 'entry',
	);
	const parent = key.path.slice(0, -1);
	return entry ? (at(entry.from, parent)?.outputs[entry.outputIndex] ?? null) : null;
}

/** What the body returned on each pass before `pass`, in this pass of the parent only. */
function arrivals(
	graph: WorkflowGraph,
	tree: FrameTree,
	frame: LoopFrame,
	parent: FramePath,
	pass: number,
	at: Lookup,
): JsonValue[] {
	const back = graph.edges.find(
		(edge) => edge.to === frame.batchNodeId && tree.classify(edge) === 'back',
	);
	if (!back) return [];
	return Array.from(
		{ length: pass },
		(_, index) => at(back.from, [...parent, index])?.outputs[back.outputIndex] ?? null,
	);
}
