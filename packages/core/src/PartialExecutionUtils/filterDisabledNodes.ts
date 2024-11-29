import { NodeConnectionType } from 'n8n-workflow';

import type { DirectedGraph } from './DirectedGraph';

export function filterDisabledNodes(graph: DirectedGraph): DirectedGraph {
	const filteredGraph = graph.clone();

	for (const node of filteredGraph.getNodes().values()) {
		if (node.disabled) {
			filteredGraph.removeNode(node, {
				reconnectConnections: true,
				skipConnectionFn: (c) => c.type !== NodeConnectionType.Main,
			});
		}
	}

	return filteredGraph;
}
