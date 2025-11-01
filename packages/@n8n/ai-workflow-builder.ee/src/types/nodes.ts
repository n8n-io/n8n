import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';

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
 * Node search result with scoring
 */
export interface NodeSearchResult {
	name: string;
	displayName: string;
	description: string;
	score: number;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

/**
 * Information about a node that was added to the workflow
 */
export interface AddedNode {
	id: string;
	name: string;
	type: string;
	displayName?: string;
	parameters?: INodeParameters;
	position: [number, number];
}
