import { NodeConnectionType, type INode, type IRunData } from 'n8n-workflow';

import type { DirectedGraph } from './directed-graph';

/**
 * Returns new run data that does not contain data for any node that is a child
 * of any start node.
 * This does not mutate the `runData` being passed in.
 */
export function cleanRunData(
	runData: IRunData,
	graph: DirectedGraph,
	startNodes: Set<INode>,
): IRunData {
	const newRunData: IRunData = { ...runData };

	for (const startNode of startNodes) {
		delete newRunData[startNode.name];

		const children = graph.getChildren(startNode);
		for (const node of [startNode, ...children]) {
			delete newRunData[node.name];

			// Delete runData for subNodes
			const subNodeConnections = graph.getParentConnections(node);
			for (const subNodeConnection of subNodeConnections) {
				// Sub nodes never use the Main connection type, so this filters out
				// the connection that goes upstream of the startNode.
				if (subNodeConnection.type === NodeConnectionType.Main) {
					continue;
				}

				delete newRunData[subNodeConnection.from.name];
			}
		}
	}

	// Remove run data for all nodes that are not part of the subgraph
	for (const nodeName of Object.keys(newRunData)) {
		if (!graph.hasNode(nodeName)) {
			// remove run data for node that is not part of the graph
			delete newRunData[nodeName];
		}
	}

	return newRunData;
}
