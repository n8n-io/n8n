import { type INodeProperties, type INodeTypeDescription } from 'n8n-workflow';

/**
 * Detailed information about a node type
 */
export interface NodeDetails {
	name: string;
	displayName: string;
	description: string;
	properties: INodeProperties[];
	subtitle?: string;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

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
