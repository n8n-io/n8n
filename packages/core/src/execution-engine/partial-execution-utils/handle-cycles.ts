import type { INode } from 'n8n-workflow';
import * as a from 'node:assert/strict';

import type { DirectedGraph } from './directed-graph';

/**
 * Returns a new set of start nodes.
 *
 * For every start node this checks if it is part of a cycle and if it is it
 * replaces the start node with the start of the cycle.
 *
 * This is useful because it prevents executing cycles partially, e.g. figuring
 * our which run of the cycle has to be repeated etc.
 */
export function handleCycles(
	graph: DirectedGraph,
	startNodes: Set<INode>,
	trigger: INode,
): Set<INode> {
	// Strongly connected components can also be nodes that are not part of a
	// cycle. They form a strongly connected component of one. E.g the trigger is
	// always a strongly connected component by itself because it does not have
	// any inputs and thus cannot build a cycle.
	//
	// We're not interested in them so we filter them out.
	const cycles = graph.getStronglyConnectedComponents().filter((cycle) => cycle.size >= 1);
	const newStartNodes: Set<INode> = new Set(startNodes);

	// For each start node, check if the node is part of a cycle and if it is
	// replace the start node with the start of the cycle.
	if (cycles.length === 0) {
		return newStartNodes;
	}

	for (const startNode of startNodes) {
		for (const cycle of cycles) {
			const isPartOfCycle = cycle.has(startNode);
			if (isPartOfCycle) {
				const firstNode = graph.depthFirstSearch({
					from: trigger,
					fn: (node) => cycle.has(node),
				});

				a.ok(
					firstNode,
					"the trigger must be connected to the cycle, otherwise the cycle wouldn't be part of the subgraph",
				);

				newStartNodes.delete(startNode);
				newStartNodes.add(firstNode);
			}
		}
	}

	return newStartNodes;
}
