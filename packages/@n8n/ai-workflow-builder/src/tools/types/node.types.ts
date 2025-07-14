import { type INodeTypeDescription } from 'n8n-workflow';

import type { NodeDetails } from '../../types/nodes';

/**
 * Helper to extract node details from a node type description
 */
export function extractNodeDetails(nodeType: INodeTypeDescription): NodeDetails {
	return {
		name: nodeType.name,
		displayName: nodeType.displayName,
		description: nodeType.description,
		properties: nodeType.properties,
		subtitle: nodeType.subtitle,
		inputs: nodeType.inputs,
		outputs: nodeType.outputs,
	};
}
