/**
 * The pieces both v1 run-data builders share: node names, forward edges, input
 * sources and the empty run. `v1-adapters` builds run data for one step's
 * expression context; `v1-execution-read` builds it for the whole execution.
 * They differ in what they report per pass, not in how a graph maps to v1.
 */

import { deriveLoops, type GraphEdge, type WorkflowGraph, type WorkflowLoop } from '@n8n/engine';
import { UnexpectedError } from '@n8n/errors';
import type { INodeExecutionData, ISourceData, ITaskData } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';

export function nodeNamesById(graph: WorkflowGraph): Map<string, string> {
	return new Map(graph.nodes.map((node) => [node.id, node.name]));
}

/** What a node's input lineage needs, prepared once for a whole execution. */
export interface SourceLineage {
	namesById: Map<string, string>;
	/** Forward edges into each node, by the node's id. */
	incomingEdgesByNodeId: Map<string, GraphEdge[]>;
	loops: WorkflowLoop[];
	/** The last pass each node is known to have run. */
	lastIterationByNodeId: Map<string, number>;
}

export function toSourceLineage(
	graph: WorkflowGraph,
	lastIterationByNodeId: Map<string, number>,
): SourceLineage {
	return {
		namesById: nodeNamesById(graph),
		incomingEdgesByNodeId: incomingEdgesByNodeId(graph),
		loops: deriveLoops(graph),
		lastIterationByNodeId,
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
	return toSourceSlots(lineage.incomingEdgesByNodeId.get(nodeId) ?? [], lineage.namesById, (edge) =>
		toPreviousNodeRun(lineage, edge, iteration),
	);
}

export function linkLoopOutputs(
	nodeExecutionData: INodeExecutionData[][],
	iteration: number,
	batchSize: number,
	backEdge: GraphEdge,
	counts: number[],
	namesById: Map<string, string>,
): INodeExecutionData[][] {
	// The done slot holds what came back on each earlier iteration, in order.
	const previousNode = namesById.get(backEdge.from);
	if (previousNode === undefined) {
		throw new UnexpectedError(
			`A back edge starts at node ${backEdge.from}, which the graph does not contain`,
		);
	}
	const doneLinks = counts.flatMap((count, run) =>
		Array.from({ length: count }, (_, position) => ({
			item: position,
			sourceOverwrite: {
				previousNode,
				previousNodeOutput: backEdge.outputIndex,
				previousNodeRun: run,
			},
		})),
	);

	return nodeExecutionData.map((items, slot) => {
		// The loop slot hands out the next batch of the loop's input.
		if (slot === 1) {
			return items.map((item, position) => ({
				...item,
				pairedItem: { item: iteration * batchSize + position },
			}));
		}
		if (slot === 0) {
			// The done slot is empty until the last iteration, which holds all the items.
			if (items.length > 0 && items.length !== doneLinks.length) {
				throw new UnexpectedError(
					`The done slot at iteration ${iteration} holds ${items.length} items, but the earlier iterations returned ${doneLinks.length}`,
				);
			}
			return items.map((item, position) => ({ ...item, pairedItem: doneLinks[position] }));
		}
		return items;
	});
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
 * Forward edges into each node, by the node's id. A back edge's source is the
 * previous pass, a lineage v1 cannot express, so it reads the forward edge into
 * the loop entry instead.
 */
export function incomingEdgesByNodeId(graph: WorkflowGraph): Map<string, GraphEdge[]> {
	const byNodeId = new Map<string, GraphEdge[]>();

	for (const edge of graph.edges) {
		if (edge.isBackEdge === true) continue;
		const edges = byNodeId.get(edge.to);
		if (edges) edges.push(edge);
		else byNodeId.set(edge.to, [edge]);
	}

	return byNodeId;
}

/**
 * One entry for each input slot of one node, indexed by slot. Empty for a node
 * with no input, `null` for an unconnected slot.
 *
 * @param edges The forward edges into the node.
 * @param previousNodeRun Which run of the predecessor fed this one. Left out
 * when the caller reports a single pass, since v1 reads a missing value as 0.
 */
export function toSourceSlots(
	edges: GraphEdge[],
	namesById: Map<string, string>,
	previousNodeRun?: (edge: GraphEdge) => number,
): Array<ISourceData | null> {
	const sources: Array<ISourceData | null> = [];

	for (const edge of edges) {
		const previousNode = namesById.get(edge.from);
		if (previousNode === undefined) continue;

		const inputIndex = edge.inputIndex ?? 0;
		while (sources.length <= inputIndex) sources.push(null);
		// First edge into a slot wins.
		if (sources[inputIndex] !== null) continue;

		const run = previousNodeRun?.(edge) ?? 0;
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
