import type { INode, IPinData, IRunData } from 'n8n-workflow';
import type { DirectedGraph } from './DirectedGraph';
import { getIncomingData } from './getIncomingData';

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

	// If we detect a cycle stop following the branch, there is no start node on
	// this branch.
	if (seen.has(current)) {
		return startNodes;
	}

	// Recurse with every direct child that is part of the sub graph.
	const outGoingConnections = graph.getDirectChildren(current);
	for (const outGoingConnection of outGoingConnections) {
		const nodeRunData = getIncomingData(
			runData,
			outGoingConnection.from.name,
			// NOTE: It's always 0 until I fix the bug that removes the run data for
			// old runs. The FE only sends data for one run for each node.
			0,
			outGoingConnection.type,
			outGoingConnection.outputIndex,
		);

		// If the node has multiple outputs, only follow the outputs that have run data.
		const hasNoRunData =
			nodeRunData === null || nodeRunData === undefined || nodeRunData.length === 0;
		if (hasNoRunData) {
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
export function findStartNodes(
	graph: DirectedGraph,
	trigger: INode,
	destination: INode,
	runData: IRunData = {},
	pinData: IPinData = {},
): INode[] {
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

	return [...startNodes];
}
