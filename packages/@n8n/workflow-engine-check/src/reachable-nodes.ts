import {
	NodeConnectionTypes,
	getChildNodes,
	isTriggerNodeType,
	type IConnections,
	type INode,
} from 'n8n-workflow';

/**
 * The names of the nodes that engine v2 runs: each live trigger and the nodes it
 * reaches over `main`. The converter drops every other node. With no live trigger
 * the converter does not root the graph, so every node counts.
 */
export function findReachableNodeNames(nodes: INode[], connections: IConnections): Set<string> {
	const triggers = nodes.filter((node) => node.disabled !== true && isTriggerNodeType(node.type));
	if (triggers.length === 0) return new Set(nodes.map((node) => node.name));

	return new Set(
		triggers.flatMap((trigger) => [
			trigger.name,
			...getChildNodes(connections, trigger.name, NodeConnectionTypes.Main, -1),
		]),
	);
}
