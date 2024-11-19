import { NodeConnectionType, type INode } from 'n8n-workflow';

import type { GraphConnection } from './DirectedGraph';
import { DirectedGraph } from './DirectedGraph';

function findSubgraphRecursive(
	graph: DirectedGraph,
	destinationNode: INode,
	current: INode,
	trigger: INode,
	newGraph: DirectedGraph,
	currentBranch: GraphConnection[],
) {
	// If the current node is the chosen trigger keep this branch.
	if (current === trigger) {
		for (const connection of currentBranch) {
			newGraph.addNodes(connection.from, connection.to);
			newGraph.addConnection(connection);
		}

		return;
	}

	let parentConnections = graph.getDirectParentConnections(current);

	// If the current node has no parents, don’t keep this branch.
	if (parentConnections.length === 0) {
		return;
	}

	// If the current node is the destination node again, don’t keep this branch.
	const isCycleWithDestinationNode =
		current === destinationNode && currentBranch.some((c) => c.to === destinationNode);
	if (isCycleWithDestinationNode) {
		return;
	}

	// If the current node was already visited, keep this branch.
	const isCycleWithCurrentNode = currentBranch.some((c) => c.to === current);
	if (isCycleWithCurrentNode) {
		// TODO: write function that adds nodes when adding connections
		for (const connection of currentBranch) {
			newGraph.addNodes(connection.from, connection.to);
			newGraph.addConnection(connection);
		}
		return;
	}

	// If the current node is disabled, don’t keep this node, but keep the
	// branch.
	// Take every incoming connection and connect it to every node that is
	// connected to the current node’s first output
	if (current.disabled) {
		// The last segment on the current branch is still pointing to the removed
		// node, so let's remove it.
		currentBranch.pop();

		// The node is replaced by a set of new connections, connecting the parents
		// and children of it directly. In the recursive call below we'll follow
		// them further.
		parentConnections = graph.removeNode(current, {
			reconnectConnections: true,
			// If the node has non-Main connections we don't want to rewire those.
			// Otherwise we'd end up connecting AI utilities to nodes that don't
			// support them.
			skipConnectionFn: (c) => c.type !== NodeConnectionType.Main,
		});
	}

	// Recurse on each parent.
	for (const parentConnection of parentConnections) {
		// Skip parents that are connected via non-Main connection types. They are
		// only utility nodes for AI and are not part of the data or control flow
		// and can never lead too the trigger.
		if (parentConnection.type !== NodeConnectionType.Main) {
			continue;
		}

		findSubgraphRecursive(graph, destinationNode, parentConnection.from, trigger, newGraph, [
			...currentBranch,
			parentConnection,
		]);
	}
}

/**
 * Find all nodes that can lead from the trigger to the destination node,
 * ignoring disabled nodes.
 *
 * The algorithm is:
 *   Start with Destination Node
 *
 *   1. if the current node is the chosen trigger keep this branch
 *   2. if the current node has no parents, don’t keep this branch
 *   3. if the current node is the destination node again, don’t keep this
 *      branch
 *   4. if the current node was already visited, keep this branch
 *   5. if the current node is disabled, don’t keep this node, but keep the
 *      branch
 *     - take every incoming connection and connect it to every node that is
 *       connected to the current node’s first output
 *   6. Recurse on each parent
 *   7. Re-add all connections that don't use the `Main` connections type.
 *      Theses are used by nodes called root nodes and they are not part of the
 *      dataflow in the graph they are utility nodes, like the AI model used in a
 *      lang chain node.
 */
export function findSubgraph(options: {
	graph: DirectedGraph;
	destination: INode;
	trigger: INode;
}): DirectedGraph {
	const graph = options.graph;
	const destination = options.destination;
	const trigger = options.trigger;
	const subgraph = new DirectedGraph();

	findSubgraphRecursive(graph, destination, destination, trigger, subgraph, []);

	// For each node in the subgraph, if it has parent connections of a type that
	// is not `Main` in the input graph, add the connections and the nodes
	// connected to it to the subgraph
	//
	// Without this all AI related workflows would not work when executed
	// partially, because all utility nodes would be missing.
	for (const node of subgraph.getNodes().values()) {
		const parentConnections = graph.getParentConnections(node);

		for (const connection of parentConnections) {
			if (connection.type === NodeConnectionType.Main) {
				continue;
			}

			subgraph.addNodes(connection.from, connection.to);
			subgraph.addConnection(connection);
		}
	}

	return subgraph;
}
