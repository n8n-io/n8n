import { NodeConnectionTypes } from 'n8n-workflow';

import type { DirectedGraph } from './directed-graph';

export function filterDisabledNodes(graph: DirectedGraph): DirectedGraph {
	const filteredGraph = graph.clone();

	for (const node of filteredGraph.getNodes().values()) {
		if (node.disabled) {
			filteredGraph.removeNode(node, {
				reconnectConnections: true,
				skipConnectionFn: (c) => c.type !== NodeConnectionTypes.Main,
			});
		}
	}

	return filteredGraph;
}
