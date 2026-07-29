import type { INode, NodeConnectionType } from 'n8n-workflow';

/**
 * Result of creating a connection between nodes
 */
export interface ConnectionResult {
	sourceNode: string;
	targetNode: string;
	connectionType: string;
	swapped: boolean;
	message: string;
}

/**
 * Result of connection validation
 */
export interface ConnectionValidationResult {
	valid: boolean;
	error?: string;
	shouldSwap?: boolean;
	swappedSource?: INode;
	swappedTarget?: INode;
}

/**
 * Connection operation result
 */
export interface ConnectionOperationResult {
	success: boolean;
	sourceNode: string;
	targetNode: string;
	connectionType: string;
	swapped: boolean;
	message: string;
	error?: string;
}

/**
 * Result of inferring connection type
 */
export interface InferConnectionTypeResult {
	connectionType?: NodeConnectionType;
	possibleTypes?: NodeConnectionType[];
	requiresSwap?: boolean;
	error?: string;
}
