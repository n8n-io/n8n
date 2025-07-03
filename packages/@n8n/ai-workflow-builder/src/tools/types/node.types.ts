import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Detailed information about a node type
 */
export interface NodeDetails {
	name: string;
	displayName: string;
	description: string;
	properties: any[];
	subtitle?: string;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

/**
 * Node creation parameters
 */
export interface NodeCreationParams {
	nodeType: string;
	name: string;
}

/**
 * Result of adding a node
 */
export interface AddedNode {
	id: string;
	name: string;
	type: string;
	displayName?: string;
	position: [number, number];
}

/**
 * Connection creation parameters
 */
export interface ConnectionParams {
	sourceNodeId: string;
	targetNodeId: string;
	connectionType: string;
	sourceOutputIndex?: number;
	targetInputIndex?: number;
}

/**
 * Result of creating a connection
 */
export interface ConnectionResult {
	sourceNode: string;
	targetNode: string;
	connectionType: string;
	swapped: boolean;
	message: string;
}

/**
 * Schema for node creation input
 */
export const nodeCreationSchema = z.object({
	nodeType: z.string().describe('The type of node to add (e.g., n8n-nodes-base.httpRequest)'),
	name: z
		.string()
		.describe('A descriptive name for the node that clearly indicates its purpose in the workflow'),
});

/**
 * Schema for batch node creation
 */
export const addNodesSchema = z.object({
	nodes: z.array(nodeCreationSchema).describe('Array of nodes to add to the workflow'),
});

/**
 * Schema for node connection
 */
export const nodeConnectionSchema = z.object({
	sourceNodeId: z
		.string()
		.describe(
			'The ID of the source node. For ai_* connections (ai_languageModel, ai_tool, etc.), this MUST be the sub-node (e.g., OpenAI Chat Model). For main connections, this is the node producing the output',
		),
	targetNodeId: z
		.string()
		.describe(
			'The ID of the target node. For ai_* connections, this MUST be the main node that accepts the sub-node (e.g., AI Agent, Basic LLM Chain). For main connections, this is the node receiving the input',
		),
	connectionType: z
		.string()
		.describe(
			'The type of connection: "main" for regular data flow, or sub-node types like "ai_languageModel" (for LLM models), "ai_tool" (for agent tools), "ai_memory" (for chat memory) etc.',
		),
	sourceOutputIndex: z
		.number()
		.optional()
		.describe('The index of the output to connect from (default: 0)'),
	targetInputIndex: z
		.number()
		.optional()
		.describe('The index of the input to connect to (default: 0)'),
});

/**
 * Type guards
 */
export function isNodeDetails(obj: any): obj is NodeDetails {
	return (
		obj &&
		typeof obj === 'object' &&
		typeof obj.name === 'string' &&
		typeof obj.displayName === 'string' &&
		typeof obj.description === 'string' &&
		Array.isArray(obj.properties) &&
		obj.inputs !== undefined &&
		obj.outputs !== undefined
	);
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
