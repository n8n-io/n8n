import { NodeConnectionTypes, type INode, type IRunData } from 'n8n-workflow';

import type { DirectedGraph } from './directed-graph';

/**
 * Returns new run data that does not contain data for any node that is a child
 * of any of the passed nodes. This is useful for cleaning run data after start
 * nodes or dirty nodes.
 *
 * This does not mutate the `runData` being passed in.
 */
export function cleanRunData(
	runData: IRunData,
	graph: DirectedGraph,
	nodesToClean: Set<INode>,
): IRunData {
	const newRunData: IRunData = { ...runData };

	for (const nodeToClean of nodesToClean) {
		delete newRunData[nodeToClean.name];

		const children = graph.getChildren(nodeToClean);
		for (const node of [nodeToClean, ...children]) {
			delete newRunData[node.name];

			// Delete runData for subNodes
			const subNodeConnections = graph.getParentConnections(node);
			for (const subNodeConnection of subNodeConnections) {
				// Sub nodes never use the Main connection type, so this filters out
				// the connection that goes upstream of the node to clean.
				if (subNodeConnection.type === NodeConnectionTypes.Main) {
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
