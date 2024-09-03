import type { INode, IPinData, IRunData } from 'n8n-workflow';
import type { Connection, DirectedGraph } from './DirectedGraph';
import { getIncomingData } from './getIncomingData';

// TODO: This is how ISourceData should look like.
type NewSourceData = {
	connection: Connection;
	previousNodeRun: number; // If undefined "0" gets used
};

// TODO: rename to something more general, like path segment
export interface StartNodeData {
	node: INode;
	sourceData: NewSourceData[];
}

// TODO: implement dirty checking for options and properties and parent nodes
// being disabled
export function isDirty(node: INode, runData: IRunData = {}, pinData: IPinData = {}): boolean {
	//- it’s properties or options changed since last execution, or

	const propertiesOrOptionsChanged = false;

	if (propertiesOrOptionsChanged) {
		return true;
	}

	const parentNodeGotDisabled = false;

	if (parentNodeGotDisabled) {
		return true;
	}

	//- it has an error, or

	const hasAnError = false;

	if (hasAnError) {
		return true;
	}

	//- it does neither have run data nor pinned data

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
		// found start nodes
		new Set(),
		// seen
		new Set(),
	);

	return [...startNodes];
}
