import type { INode } from 'n8n-workflow';
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

	let parentConnections = graph.getDirectParents(current);

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
		const incomingConnections = graph.getDirectParents(current);
		const outgoingConnections = graph
			.getDirectChildren(current)
			// NOTE: When a node is disabled only the first output gets data
			.filter((connection) => connection.outputIndex === 0);

		parentConnections = [];

		for (const incomingConnection of incomingConnections) {
			for (const outgoingConnection of outgoingConnections) {
				const newConnection = {
					...incomingConnection,
					to: outgoingConnection.to,
					inputIndex: outgoingConnection.inputIndex,
				};

				parentConnections.push(newConnection);
				currentBranch.pop();
				currentBranch.push(newConnection);
			}
		}
	}

	// Recurse on each parent.
	for (const parentConnection of parentConnections) {
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
 */
export function findSubgraph(
	graph: DirectedGraph,
	destinationNode: INode,
	trigger: INode,
): DirectedGraph {
	const newGraph = new DirectedGraph();

	findSubgraphRecursive(graph, destinationNode, destinationNode, trigger, newGraph, []);

	return newGraph;
}
