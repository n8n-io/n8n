import type { INode } from 'n8n-workflow';

const EXECUTE_WORKFLOW_TYPE = 'n8n-nodes-base.executeWorkflow';

/**
 * Extract the called workflow ID from an Execute Workflow node.
 * Returns undefined if the node is not an Execute Workflow node,
 * or if the source is parameter/localFile/url (not a DB reference).
 */
export function getSubWorkflowId(node: INode): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW_TYPE) return undefined;

	if (node.parameters?.['source'] === 'parameter') return undefined;
	if (node.parameters?.['source'] === 'localFile') return undefined;
	if (node.parameters?.['source'] === 'url') return undefined;

	if (!('workflowId' in node.parameters)) return undefined;

	if (typeof node.parameters['workflowId'] === 'string') {
		return node.parameters['workflowId'];
	}

	if (
		typeof node.parameters['workflowId'] === 'object' &&
		node.parameters['workflowId'] !== null &&
		'value' in node.parameters['workflowId'] &&
		typeof node.parameters['workflowId']['value'] === 'string'
	) {
		return node.parameters['workflowId']['value'];
	}

	return undefined;
}

/**
 * Remap sub-workflow references in Execute Workflow nodes using
 * the provided source ID → target ID bindings.
 */
export function remapSubWorkflowIds(nodes: INode[], bindings: Map<string, string>): void {
	for (const node of nodes) {
		const currentId = getSubWorkflowId(node);
		if (!currentId) continue;

		const mapped = bindings.get(currentId);
		if (!mapped) continue;

		if (typeof node.parameters?.['workflowId'] === 'string') {
			node.parameters['workflowId'] = mapped;
		} else if (
			node.parameters &&
			typeof node.parameters['workflowId'] === 'object' &&
			node.parameters['workflowId'] !== null &&
			'value' in node.parameters['workflowId']
		) {
			(node.parameters['workflowId'] as Record<string, unknown>)['value'] = mapped;
		}
	}
}
