/**
 * The pieces both v1 run-data builders share: node names, forward edges, input
 * sources and the empty run. `v1-adapters` builds run data for one step's
 * expression context; `v1-execution-read` builds it for the whole execution.
 * They differ in what they report per pass, not in how a graph maps to v1.
 */

import type { GraphEdge, StepKey, StepSources, WorkflowGraph } from '@n8n/engine';
import type { ISourceData, ITaskData } from 'n8n-workflow';

import { MAIN_CONNECTION_TYPE } from './constants';

export function nodeNamesById(graph: WorkflowGraph): Map<string, string> {
	return new Map(graph.nodes.map((node) => [node.id, node.name]));
}

/**
 * Forward edges by target node. A back edge's source is the previous pass, a
 * lineage v1 cannot express, so it reads the forward edge into the loop entry
 * instead.
 */
export function forwardEdgesByTarget(graph: WorkflowGraph): Map<string, GraphEdge[]> {
	const edgesByTarget = new Map<string, GraphEdge[]>();

	for (const edge of graph.edges) {
		if (edge.isBackEdge === true) continue;
		const edges = edgesByTarget.get(edge.to);
		if (edges) edges.push(edge);
		else edgesByTarget.set(edge.to, [edge]);
	}

	return edgesByTarget;
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

/**
 * Where each step sits among its node's v1 runs. A node can run several times
 * at one loop pass when live branches converged upstream, so a v1 run index is
 * the runs of every earlier pass plus the step's branch. A pass with no steps
 * still counts as one run, as v1 shows a skipped pass as an empty run. Without
 * convergence, every pass has one run and the run index is the pass.
 */
export interface RunLayout {
	/** Runs per node per pass, by node id, then by iteration. Absent means one. */
	runCounts: Record<string, Record<number, number>>;
	/** What each run read, by `runKey`. Absent for the trigger, which reads nothing. */
	sources: Record<string, StepSources>;
}

export const SINGLE_RUN_LAYOUT: RunLayout = { runCounts: {}, sources: {} };

/** The v1 run index of a step. */
export function runIndexOf(layout: RunLayout, { nodeId, iteration, branch }: StepKey): number {
	const counts = layout.runCounts[nodeId] ?? {};
	let index = branch;
	for (let pass = 0; pass < iteration; pass++) index += counts[pass] ?? 1;
	return index;
}

/** The v1 run index of a node's last run at a pass. */
export function lastRunIndexAt(layout: RunLayout, nodeId: string, iteration: number): number {
	const runs = layout.runCounts[nodeId]?.[iteration] ?? 1;
	return runIndexOf(layout, { nodeId, iteration, branch: runs - 1 });
}

export function runKey(nodeId: string, runIndex: number): string {
	return `${nodeId}#${runIndex}`;
}

/** Builds the layout from every step of an execution, whatever its status. */
export function toRunLayout(steps: Array<StepKey & { sources: StepSources | null }>): RunLayout {
	const runCounts: RunLayout['runCounts'] = {};
	for (const { nodeId, iteration, branch } of steps) {
		const counts = (runCounts[nodeId] ??= {});
		counts[iteration] = Math.max(counts[iteration] ?? 1, branch + 1);
	}

	const layout: RunLayout = { runCounts, sources: {} };
	for (const step of steps) {
		if (step.sources === null) continue;
		layout.sources[runKey(step.nodeId, runIndexOf(layout, step))] = step.sources;
	}
	return layout;
}

/**
 * The v1 input provenance of one run: for each input slot, the node, output and
 * run that fed it. `null` for a slot nothing live fed.
 */
export function toRunSourceSlots(
	sources: StepSources,
	namesById: Map<string, string>,
	layout: RunLayout,
): Array<ISourceData | null> {
	return sources.map((source) => {
		if (source === null) return null;
		const previousNode = namesById.get(source.nodeId);
		if (previousNode === undefined) return null;

		const run = runIndexOf(layout, source);
		return {
			previousNode,
			previousNodeOutput: source.outputIndex,
			// v1 reads a missing value as 0.
			...(run === 0 ? {} : { previousNodeRun: run }),
		};
	});
}
