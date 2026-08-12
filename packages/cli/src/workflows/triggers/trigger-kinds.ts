import type { WorkflowPublicationTriggerKind } from '@n8n/db';
import type { INode, INodeTypes } from 'n8n-workflow';
import {
	ERROR_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	Workflow,
} from 'n8n-workflow';

// Their trigger() is a no-op — fired by the execution engine, never the
// registry — so reconciling them against the registry would re-enqueue forever.
const PSEUDO_TRIGGER_NODE_TYPES = new Set<string>([
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
]);

/**
 * Maps each node to where it lives once activated, decided by which functions
 * its node type implements: nodes with a `poll` or `trigger` function register
 * `in-memory`, nodes with only a `webhook` function are `persisted` rows in
 * `webhook_entity`. The pseudo triggers (manual, executeWorkflow, error) are
 * `persisted` despite their `trigger` function: it is a no-op fired by the
 * execution engine, so the registry holds nothing worth reconciling for them.
 */
export function getTriggerKinds(
	nodes: INode[],
	nodeTypes: INodeTypes,
): Map<INode['id'], WorkflowPublicationTriggerKind> {
	const workflow = new Workflow({
		id: 'trigger-diff',
		name: 'trigger-diff',
		nodes,
		connections: {},
		active: false,
		nodeTypes,
	});

	const inMemoryNodeIds = new Set(
		[...workflow.getPollNodes(), ...workflow.getTriggerNodes()]
			.filter((node) => !PSEUDO_TRIGGER_NODE_TYPES.has(node.type))
			.map((node) => node.id),
	);

	const kinds = new Map<INode['id'], WorkflowPublicationTriggerKind>();
	for (const node of nodes) {
		kinds.set(node.id, inMemoryNodeIds.has(node.id) ? 'in-memory' : 'persisted');
	}

	return kinds;
}
