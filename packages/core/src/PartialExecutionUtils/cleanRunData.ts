import type { INode, IRunData } from 'n8n-workflow';

import type { DirectedGraph } from './DirectedGraph';

/**
 * Returns new run data that does not contain data for any node that is a child
 * of any start node.
 * This does not mutate the `runData` being passed in.
 */
export function cleanRunData(
	runData: IRunData,
	graph: DirectedGraph,
	startNodes: INode[],
): IRunData {
	const newRunData: IRunData = { ...runData };

	for (const startNode of startNodes) {
		delete newRunData[startNode.name];
		const children = graph.getChildren(startNode);

		for (const child of children) {
			delete newRunData[child.name];
		}
	}

	return newRunData;
}
