import type { WorkflowLoop } from './loops';
import { isRaceStepConfig, type WorkflowGraph } from './workflow-graph';

/** A race node that cancels the other branches, and the nodes it cancels. */
export interface CancellingRace {
	raceNodeId: string;
	region: Set<string>;
}

/**
 * The nodes a race cancels once one branch wins: its ancestors whose every
 * successor is in the region or is the race itself. A node that also feeds
 * anything else keeps running, so cancelling never reaches unrelated work.
 *
 * The region keeps to the race's own pass. It holds only nodes of the race's
 * loop, or only nodes outside every loop when the race is outside every loop.
 * A batch node or the trigger is never in it.
 */
export function getRaceCancelRegion(
	graph: WorkflowGraph,
	loops: WorkflowLoop[],
	raceNodeId: string,
): Set<string> {
	const loopOf = (nodeId: string) => loops.find((loop) => loop.memberIds.has(nodeId));
	const raceLoop = loopOf(raceNodeId);
	const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

	const region = new Set<string>();
	const pending = [raceNodeId];
	while (pending.length > 0) {
		const nodeId = pending.pop();
		for (const edge of graph.edges) {
			if (edge.to !== nodeId || edge.isBackEdge || region.has(edge.from)) continue;
			const type = nodesById.get(edge.from)?.type;
			if (type === 'trigger' || type === 'batch' || loopOf(edge.from) !== raceLoop) continue;
			region.add(edge.from);
			pending.push(edge.from);
		}
	}

	// Drop every node that leads anywhere else, until none does.
	let changed = true;
	while (changed) {
		changed = false;
		for (const nodeId of region) {
			const leaks = graph.edges.some(
				(edge) => edge.from === nodeId && edge.to !== raceNodeId && !region.has(edge.to),
			);
			if (leaks) {
				region.delete(nodeId);
				changed = true;
			}
		}
	}

	return region;
}

/** Every race node set to cancel the other branches, with the nodes it cancels. */
export function getCancellingRaces(graph: WorkflowGraph, loops: WorkflowLoop[]): CancellingRace[] {
	return graph.nodes
		.filter(
			(node) =>
				node.type === 'race' && isRaceStepConfig(node.config) && node.config.cancelOtherBranches,
		)
		.map((node) => ({ raceNodeId: node.id, region: getRaceCancelRegion(graph, loops, node.id) }));
}
