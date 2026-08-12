import { DirectedGraph, filterDisabledNodes } from 'n8n-core';
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	NodeConnectionTypes,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import type { INode, INodeExecutionData, Workflow, WebhookResponseMode } from 'n8n-workflow';

/**
 * Index of the output a trigger emitted on. A trigger fills exactly one slot of
 * its `workflowData`, so the first non-empty one identifies the branch.
 */
export function firedOutputIndex(workflowData?: INodeExecutionData[][]): number {
	if (!workflowData) return 0;
	const index = workflowData.findIndex((items) => items !== undefined && items.length > 0);
	return index === -1 ? 0 : index;
}

/**
 * Whether a Respond to Webhook node sits anywhere downstream of one output of
 * the trigger.
 *
 * Deliberately permissive: it asks "reachable", not "guaranteed to run", which
 * is undecidable — any node emitting zero items starves its branch. Being wrong
 * in this direction costs one fallback to the last node's data, whereas the
 * opposite silently discards a Respond node's status code and headers.
 */
export function hasReachableResponder(
	workflow: Workflow,
	triggerNodeName: string,
	outputIndex: number,
): boolean {
	const graph = filterDisabledNodes(DirectedGraph.fromWorkflow(workflow));

	const trigger = graph.getNodes().get(triggerNodeName);
	if (!trigger) return false;

	const seen = new Set<INode>();
	const frontier = graph
		.getDirectChildConnections(trigger)
		.filter((c) => c.type === NodeConnectionTypes.Main && c.outputIndex === outputIndex)
		.map((c) => c.to);

	while (frontier.length > 0) {
		const node = frontier.pop() as INode;
		if (seen.has(node)) continue;
		seen.add(node);

		if (node.type === RESPOND_TO_WEBHOOK_NODE_TYPE) return true;

		// A sub-execution gets its own lifecycle hooks, so a Respond node inside one
		// never answers this request.
		if (node.type === EXECUTE_WORKFLOW_NODE_TYPE) continue;

		for (const connection of graph.getDirectChildConnections(node)) {
			if (connection.type !== NodeConnectionTypes.Main) continue;
			if (!seen.has(connection.to)) frontier.push(connection.to);
		}
	}

	return false;
}

export function resolveAutoResponseMode(
	mode: WebhookResponseMode,
	workflow: Workflow,
	triggerNodeName: string,
	workflowData?: INodeExecutionData[][],
): WebhookResponseMode {
	if (mode !== 'auto') return mode;

	return hasReachableResponder(workflow, triggerNodeName, firedOutputIndex(workflowData))
		? 'responseNode'
		: 'lastNode';
}
