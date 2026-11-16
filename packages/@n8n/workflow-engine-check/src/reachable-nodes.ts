import {
	NodeConnectionTypes,
	getChildNodes,
	isTriggerNodeType,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import type { EngineV2EligibilityWorkflow } from './types';

/**
 * Each live trigger and the nodes it reaches over `main`, disabled nodes included.
 * With no live trigger the converter does not root the graph, so every node counts.
 */
function findReachableNodeNames(nodes: INode[], connections: IConnections): Set<string> {
	const triggers = nodes.filter((node) => node.disabled !== true && isTriggerNodeType(node.type));
	if (triggers.length === 0) return new Set(nodes.map((node) => node.name));

	return new Set(
		triggers.flatMap((trigger) => [
			trigger.name,
			...getChildNodes(connections, trigger.name, NodeConnectionTypes.Main, -1),
		]),
	);
}

/**
 * Keeps only what engine v2 runs, like the converter's `rootAt`: the reachable nodes
 * and the connections that leave them. Every rule sees this workflow.
 */
export function rootWorkflow(workflow: EngineV2EligibilityWorkflow): EngineV2EligibilityWorkflow {
	const reachable = findReachableNodeNames(workflow.nodes, workflow.connections);
	return {
		...workflow,
		nodes: workflow.nodes.filter((node) => reachable.has(node.name)),
		connections: Object.fromEntries(
			Object.entries(workflow.connections).filter(([source]) => reachable.has(source)),
		),
	};
}
