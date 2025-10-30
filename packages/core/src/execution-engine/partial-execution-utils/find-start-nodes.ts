import { NodeConnectionTypes, type INode, type IPinData, type IRunData } from 'n8n-workflow';

import type { DirectedGraph } from './directed-graph';
import { getIncomingData, getIncomingDataFromAnyRun } from './get-incoming-data';

/**
 * A node is dirty if either of the following is true:
 *   - it's properties or options changed since last execution (not implemented yet)
 *   - one of it's parents is disabled
 *   - it has an error (not implemented yet)
 *   - it neither has run data nor pinned data
 */
export function isDirty(node: INode, runData: IRunData = {}, pinData: IPinData = {}): boolean {
	// TODO: implement
	const propertiesOrOptionsChanged = false;

	if (propertiesOrOptionsChanged) {
		return true;
	}

	// TODO: implement
	const parentNodeGotDisabled = false;

	if (parentNodeGotDisabled) {
		return true;
	}

	// TODO: implement
	const hasAnError = false;

	if (hasAnError) {
		return true;
	}

	const hasPinnedData = pinData[node.name] !== undefined;

	if (hasPinnedData) {
		return false;
	}

	const hasRunData = runData?.[node.name];

	if (hasRunData) {
		return false;
	}

	return true;
}

function findStartNodesRecursive(
	graph: DirectedGraph,
	current: INode,
	destination: INode,
	runData: IRunData,
	pinData: IPinData,
	startNodes: Set<INode>,
	seen: Set<INode>,
): Set<INode> {
	const nodeIsDirty = isDirty(current, runData, pinData);

	// If the current node is dirty stop following this branch, we found a start
	// node.
	if (nodeIsDirty) {
		startNodes.add(current);

		return startNodes;
	}

	// If the current node is the destination node stop following this branch, we
	// found a start node.
	if (current === destination) {
		startNodes.add(current);
		return startNodes;
	}

	// If the current node is a loop node, check if the `done` output has data on
	// the last run. If it doesn't the loop wasn't fully executed and needs to be
	// re-run from the start. Thus the loop node become the start node.
	if (current.type === 'n8n-nodes-base.splitInBatches') {
		const nodeRunData = getIncomingData(
			runData,
			current.name,
			// last run
			-1,
			NodeConnectionTypes.Main,
			0,
		);

		if (nodeRunData === null || nodeRunData.length === 0) {
			startNodes.add(current);
			return startNodes;
		}
	}

	// If we detect a cycle stop following the branch, there is no start node on
	// this branch.
	if (seen.has(current)) {
		return startNodes;
	}

	// Recurse with every direct child that is part of the sub graph.
	const outGoingConnections = graph.getDirectChildConnections(current);
	for (const outGoingConnection of outGoingConnections) {
		const nodeRunData = getIncomingDataFromAnyRun(
			runData,
			outGoingConnection.from.name,
			outGoingConnection.type,
			outGoingConnection.outputIndex,
		);

		// If the node has multiple outputs, only follow the outputs that have run data.
		const hasNoRunData =
			nodeRunData === null || nodeRunData === undefined || nodeRunData.data.length === 0;
		const hasNoPinnedData = pinData[outGoingConnection.from.name] === undefined;
		if (hasNoRunData && hasNoPinnedData) {
			continue;
		}

		findStartNodesRecursive(
			graph,
			outGoingConnection.to,
			destination,
			runData,
			pinData,
			startNodes,
			new Set(seen).add(current),
		);
	}

	return startNodes;
}

/**
 * The start node is the node from which a partial execution starts. The start
 * node will be executed or re-executed.
 * The nodes are found by traversing the graph from the trigger to the
 * destination and finding the earliest dirty nodes on every branch.
 *
 * The algorithm is:
 *  Starting from the trigger node.
 *
 * 	1. if the current node is not a trigger and has no input data (on all
 * 	   connections) (not implemented yet, possibly not necessary)
 * 	  - stop following this branch, there is no start node on this branch
 * 	2. If the current node is dirty, or is the destination node
 * 	  - stop following this branch, we found a start node
 * 	3. If we detect a cycle
 * 	  - stop following the branch, there is no start node on this branch
 * 	4. Recurse with every direct child that is part of the sub graph
 */
export function findStartNodes(options: {
	graph: DirectedGraph;
	trigger: INode;
	destination: INode;
	pinData: IPinData;
	runData: IRunData;
}): Set<INode> {
	const graph = options.graph;
	const trigger = options.trigger;
	const destination = options.destination;
	const runData = { ...options.runData };
	const pinData = options.pinData;

	const startNodes = findStartNodesRecursive(
		graph,
		trigger,
		destination,
		runData,
		pinData,
		// start nodes found
		new Set(),
		// seen
		new Set(),
	);

	return startNodes;
}
