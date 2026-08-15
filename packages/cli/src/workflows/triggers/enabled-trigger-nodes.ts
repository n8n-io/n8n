import type { IConnections, INode, INodeTypes } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

export type WorkflowTriggerVersion = { nodes: INode[]; connections: IConnections };

/**
 * Returns the enabled trigger-like nodes (active, poll, schedule and webhook
 * triggers) of a workflow version. Disabled nodes are excluded, so the result
 * is the set of nodes that actually drive trigger registration.
 *
 * A free function rather than a method so callers that only need the
 * classification — the publish-time node id check on the API side — can reuse it
 * without depending on `WorkflowTriggerActivator`, which owns trigger
 * registration and only constructs when the publication service is enabled.
 * One implementation keeps that check and publication agreeing on which nodes
 * get a trigger status row.
 */
export function getEnabledTriggerNodes(
	version: WorkflowTriggerVersion | null,
	nodeTypes: INodeTypes,
): INode[] {
	if (!version) return [];

	const workflow = new Workflow({
		id: 'trigger-diff',
		name: 'trigger-diff',
		nodes: version.nodes,
		connections: version.connections,
		active: false,
		nodeTypes,
	});

	return workflow.queryNodes(
		(nodeType) => !!nodeType.trigger || !!nodeType.poll || !!nodeType.webhook,
	);
}
