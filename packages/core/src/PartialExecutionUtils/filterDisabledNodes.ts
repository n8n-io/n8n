import { NodeConnectionType } from 'n8n-workflow';

import { DirectedGraph } from './DirectedGraph';

export function filterDisabledNodes(graph: DirectedGraph): DirectedGraph {
	const filteredGraph = DirectedGraph.fromDirectedGraph(graph);

	for (const node of filteredGraph.getNodes().values()) {
		if (node.disabled) {
			// remove node
			filteredGraph.removeNode(node, {
				reconnectConnections: true,
				skipConnectionFn: (c) => c.type !== NodeConnectionType.Main,
			});
		}
	}

	return filteredGraph;
}
