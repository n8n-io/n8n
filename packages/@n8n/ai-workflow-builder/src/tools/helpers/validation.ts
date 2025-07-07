import type { INode, INodeTypeDescription } from 'n8n-workflow';

import type { ToolError } from './progress';
import type { SimpleWorkflow } from '../../types';

/**
 * Validate that a node exists in the workflow
 */
export function validateNodeExists(nodeId: string, nodes: INode[]): INode | null {
	return nodes.find((n) => n.id === nodeId) ?? null;
}

/**
 * Find a node by name (case-insensitive)
 */
export function findNodeByName(nodeName: string, nodes: INode[]): INode | null {
	return nodes.find((n) => n.name.toLowerCase() === nodeName.toLowerCase()) ?? null;
}

/**
 * Find a node by ID or name
 */
export function findNodeByIdOrName(nodeIdentifier: string, nodes: INode[]): INode | null {
	// First try exact ID match
	const byId = validateNodeExists(nodeIdentifier, nodes);
	if (byId) return byId;

	// Then try name match
	return findNodeByName(nodeIdentifier, nodes);
}

/**
 * Find a node type by name
 */
export function findNodeType(
	nodeTypeName: string,
	nodeTypes: INodeTypeDescription[],
): INodeTypeDescription | null {
	return nodeTypes.find((nt) => nt.name === nodeTypeName) ?? null;
}

/**
 * Validate that a connection is possible between two nodes
 */
export function validateConnection(sourceNode: INode, targetNode: INode): ToolError | null {
	// Check if source and target are the same
	if (sourceNode.id === targetNode.id) {
		return {
			message: 'Cannot connect a node to itself',
			code: 'SELF_CONNECTION',
			details: { sourceId: sourceNode.id, targetId: targetNode.id },
		};
	}

	return null;
}

/**
 * Validate that nodes exist for a connection
 */
export function validateNodesForConnection(
	sourceIdentifier: string,
	targetIdentifier: string,
	nodes: INode[],
): { sourceNode: INode; targetNode: INode } | ToolError {
	const sourceNode = findNodeByIdOrName(sourceIdentifier, nodes);
	if (!sourceNode) {
		return {
			message: `Source node "${sourceIdentifier}" not found`,
			code: 'SOURCE_NODE_NOT_FOUND',
			details: { identifier: sourceIdentifier },
		};
	}

	const targetNode = findNodeByIdOrName(targetIdentifier, nodes);
	if (!targetNode) {
		return {
			message: `Target node "${targetIdentifier}" not found`,
			code: 'TARGET_NODE_NOT_FOUND',
			details: { identifier: targetIdentifier },
		};
	}

	// Validate the connection itself
	const connectionError = validateConnection(sourceNode, targetNode);
	if (connectionError) {
		return connectionError;
	}

	return { sourceNode, targetNode };
}

/**
 * Create a validation error
 */
export function createValidationError(
	message: string,
	code: string,
	details?: Record<string, string>,
): ToolError {
	return {
		message,
		code,
		details,
	};
}

/**
 * Create a node not found error
 */
export function createNodeNotFoundError(nodeIdentifier: string): ToolError {
	return createValidationError(
		`Node "${nodeIdentifier}" not found in the workflow`,
		'NODE_NOT_FOUND',
		{ nodeIdentifier },
	);
}

/**
 * Create a node type not found error
 */
export function createNodeTypeNotFoundError(nodeTypeName: string): ToolError {
	return createValidationError(`Node type "${nodeTypeName}" not found`, 'NODE_TYPE_NOT_FOUND', {
		nodeTypeName,
	});
}

/**
 * Validate required parameters are present
 */
export function validateRequiredParameters(
	parameters: Record<string, unknown>,
	requiredParams: string[],
): string[] {
	const missing: string[] = [];
	for (const param of requiredParams) {
		if (!(param in parameters) || parameters[param] === undefined || parameters[param] === '') {
			missing.push(param);
		}
	}
	return missing;
}

/**
 * Check if a workflow has nodes
 */
export function hasNodes(workflow: SimpleWorkflow): boolean {
	return workflow.nodes.length > 0;
}

/**
 * Check if a node has incoming connections
 */
export function hasIncomingConnections(
	nodeId: string,
	connections: SimpleWorkflow['connections'],
): boolean {
	for (const [, nodeConnections] of Object.entries(connections)) {
		for (const [, typeConnections] of Object.entries(nodeConnections)) {
			if (Array.isArray(typeConnections)) {
				for (const outputConnections of typeConnections) {
					if (Array.isArray(outputConnections)) {
						if (outputConnections.some((conn) => conn.node === nodeId)) {
							return true;
						}
					}
				}
			}
		}
	}
	return false;
}

/**
 * Check if a node has outgoing connections
 */
export function hasOutgoingConnections(
	nodeId: string,
	connections: SimpleWorkflow['connections'],
): boolean {
	return nodeId in connections && Object.keys(connections[nodeId]).length > 0;
}
