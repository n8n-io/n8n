/**
 * The pieces both v1 run-data builders share: node names, forward edges, input
 * sources and the empty run. `v1-adapters` builds run data for one step's
 * expression context; `v1-execution-read` builds it for the whole execution.
 * They differ in what they report per pass, not in how a graph maps to v1.
 */

import {
	compareByConcatenationOrder,
	deriveLoops,
	type GraphEdge,
	type ItemSource,
	type StepOutputSources,
	type StepSlots,
	type WorkflowGraph,
	type WorkflowLoop,
} from '@n8n/engine';
import type { INodeExecutionData, IPairedItemData, ISourceData, ITaskData } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';

export function nodeNamesById(graph: WorkflowGraph): Map<string, string> {
	return new Map(graph.nodes.map((node) => [node.id, node.name]));
}

/** What a node's input lineage needs. */
export interface SourceLineage {
	namesById: Map<string, string>;
	/** Forward edges into each node, by the node's id, in concatenation order. */
	incomingEdgesByNodeId: Map<string, GraphEdge[]>;
	loops: WorkflowLoop[];
	/** The last pass each node is known to have run. */
	lastIterationByNodeId: Map<string, number>;
	/** The outputs of a node's completed pass, else `undefined`. */
	outputsAt: (nodeId: string, iteration: number) => StepSlots | undefined;
}

export function toSourceLineage(
	graph: WorkflowGraph,
	lastIterationByNodeId: Map<string, number>,
	outputsAt: SourceLineage['outputsAt'],
): SourceLineage {
	return {
		namesById: nodeNamesById(graph),
		incomingEdgesByNodeId: incomingEdgesByNodeId(graph),
		loops: deriveLoops(graph),
		lastIterationByNodeId,
		outputsAt,
	};
}

/**
 * One source per input slot of `nodeId` at `iteration`: the predecessor, its
 * output slot and the pass that fed this one, or `null` for an unconnected slot.
 * Inside a loop the run data holds every finished pass, and a source without a
 * pass reads pass 0.
 */
export function toSourcesAt(
	lineage: SourceLineage,
	nodeId: string,
	iteration: number,
): Array<ISourceData | null> {
	const previousNodeRun = (edge: GraphEdge) => toPreviousNodeRun(lineage, edge, iteration);
	// Live as `readEdgeValue` counts it: the source's pass completed and filled the slot.
	const isLive = (edge: GraphEdge) =>
		(lineage.outputsAt(edge.from, previousNodeRun(edge))?.[edge.outputIndex] ?? null) !== null;
	return toSourceSlots(
		lineage.incomingEdgesByNodeId.get(nodeId) ?? [],
		lineage.namesById,
		previousNodeRun,
		isLive,
	);
}

/**
 * Which run of the predecessor fed this pass. The cases follow `classifyEdge`
 * in the engine's `iteration-mapping`: an edge inside one loop keeps the pass,
 * an edge leaving a loop reads its last pass, and anything else reads run 0.
 */
function toPreviousNodeRun(lineage: SourceLineage, edge: GraphEdge, iteration: number): number {
	const sourceLoop = lineage.loops.find((loop) => loop.memberIds.has(edge.from));
	// `plain` or `entry`: the predecessor ran once.
	if (!sourceLoop) return 0;
	// `intra`: both ends share a pass.
	if (sourceLoop.memberIds.has(edge.to)) return iteration;
	// `exit`: the predecessor's terminal pass.
	return lineage.lastIterationByNodeId.get(edge.from) ?? 0;
}

/**
 * Forward edges into each node, by the node's id. Back edges are left out, so a
 * loop node's source names its entry edge on every iteration.
 */
export function incomingEdgesByNodeId(graph: WorkflowGraph): Map<string, GraphEdge[]> {
	const byNodeId = new Map<string, GraphEdge[]>();

	for (const edge of graph.edges) {
		if (edge.isBackEdge === true) continue;
		const edges = byNodeId.get(edge.to);
		if (edges) edges.push(edge);
		else byNodeId.set(edge.to, [edge]);
	}

	const byConcatenationOrder = compareByConcatenationOrder(graph);
	for (const edges of byNodeId.values()) edges.sort(byConcatenationOrder);

	return byNodeId;
}

/**
 * One entry for each input slot of one node, indexed by slot. Empty for a node
 * with no input, `null` for an unconnected slot.
 *
 * @param edges The forward edges into the node, in concatenation order.
 * @param previousNodeRun Which run of the predecessor fed this one.
 * @param isLive Whether the edge delivered data. A live edge wins over a dead one.
 */
function toSourceSlots(
	edges: GraphEdge[],
	namesById: Map<string, string>,
	previousNodeRun: (edge: GraphEdge) => number,
	isLive: (edge: GraphEdge) => boolean,
): Array<ISourceData | null> {
	const sources: Array<ISourceData | null> = [];
	const ordered = [...edges.filter(isLive), ...edges.filter((edge) => !isLive(edge))];

	for (const edge of ordered) {
		const previousNode = namesById.get(edge.from);
		if (previousNode === undefined) continue;

		const inputIndex = edge.inputIndex ?? 0;
		while (sources.length <= inputIndex) sources.push(null);
		// The first live edge into a slot wins, else the first edge, so `$prevNode`
		// names a node that sent items when one did. When several edges feed a
		// slot, every item carries its own source in `pairedItem` (`item-links.ts`).
		if (sources[inputIndex] !== null) continue;

		const run = previousNodeRun(edge);
		sources[inputIndex] = {
			previousNode,
			previousNodeOutput: edge.outputIndex,
			// v1 reads a missing value as 0, so only a real loop pass is reported.
			...(run === 0 ? {} : { previousNodeRun: run }),
		};
	}

	return sources;
}

/**
 * A pass the node recorded nothing for. v1 reads whatever `ITaskData[]` entry it
 * finds, so a gap would crash it. The run holds one empty slot, since zero slots
 * reads to v1 as no data at all.
 */
export function emptyRun(
	executionIndex: number,
	source: Array<ISourceData | null> = [],
): ITaskData {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex,
		source,
		data: { [MAIN_CONNECTION_TYPE]: [[]] },
	};
}

/**
 * One link per item of `sources`, in item order: the item's index in its source
 * slot, with the source as `sourceOverwrite`. `undefined` for an item whose
 * source node is not in `namesById`.
 */
export function sourceLinks(
	sources: ItemSource[],
	namesById: Map<string, string>,
): Array<IPairedItemData | undefined> {
	return sources.flatMap((source) => {
		const previousNode = namesById.get(source.nodeId);
		// Keep the positions of the sources after this one.
		if (previousNode === undefined)
			return Array.from({ length: source.itemCount }, () => undefined);
		return Array.from({ length: source.itemCount }, (_, offset) => ({
			item: source.offset + offset,
			sourceOverwrite: {
				previousNode,
				previousNodeOutput: source.outputIndex,
				previousNodeRun: source.iteration,
			},
		}));
	});
}

/**
 * Returns the output items of a step with the paired item the engine states for
 * them. The engine says "these `itemCount` items came from node X, slot s, pass
 * p, from `offset` on"; v1's data proxy reads the same fact as
 * `pairedItem.sourceOverwrite` plus the item's index in that slot. A step that
 * states no source keeps its items as they are.
 */
export function linkOutputSources(
	slots: INodeExecutionData[][],
	outputSources: StepOutputSources | null,
	namesById: Map<string, string>,
): INodeExecutionData[][] {
	// A data plane older than this field leaves it out of the step it sends.
	if (!outputSources) return slots;
	return slots.map((items, slotIndex) => {
		const sources = outputSources[slotIndex];
		if (!sources) return items;
		const links = sourceLinks(sources, namesById);
		return items.map((item, index) =>
			links[index] === undefined ? item : { ...item, pairedItem: links[index] },
		);
	});
}
