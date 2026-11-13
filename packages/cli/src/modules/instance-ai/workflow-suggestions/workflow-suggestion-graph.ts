import isEqual from 'lodash/isEqual';

type Graph = { nodes: unknown; connections: unknown };

export function hasGraphChanges(original: Graph, graph: Graph) {
	return !isEqual(original.nodes, graph.nodes) || !isEqual(original.connections, graph.connections);
}
