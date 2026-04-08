import { DATA_TABLE_NODE_TYPES, type INode } from 'n8n-workflow';

/**
 * Extracts the called sub-workflow ID from an Execute Workflow node.
 * Returns undefined if the node doesn't reference a database-stored workflow
 * (e.g. parameter, localFile, or URL sources) or if the ID can't be determined.
 */
export function getCalledWorkflowIdFromNode(node: INode): string | undefined {
	if (node.type !== 'n8n-nodes-base.executeWorkflow') {
		return undefined;
	}
	if (
		node.parameters?.['source'] === 'parameter' ||
		node.parameters?.['source'] === 'localFile' ||
		node.parameters?.['source'] === 'url'
	) {
		return undefined;
	}
	if (!('workflowId' in node.parameters)) {
		return undefined;
	}
	if (typeof node.parameters['workflowId'] === 'string') {
		return node.parameters['workflowId'];
	}
	if (
		node.parameters &&
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
 * Extracts the data table ID from a data table node.
 * Returns undefined if the node isn't a data table node type, if the ID
 * is missing, or if the ID contains expressions that can't be statically resolved.
 */
export function getDataTableIdFromNode(node: INode): string | undefined {
	if (!DATA_TABLE_NODE_TYPES.includes(node.type)) {
		return undefined;
	}
	const dataTableId = node.parameters?.['dataTableId'] as
		| { mode?: string; value?: string }
		| undefined;
	if (!dataTableId?.value || typeof dataTableId.value !== 'string') {
		return undefined;
	}
	// Skip expression-based IDs that can't be statically resolved
	if (dataTableId.value.includes('{')) {
		return undefined;
	}
	return dataTableId.value;
}
