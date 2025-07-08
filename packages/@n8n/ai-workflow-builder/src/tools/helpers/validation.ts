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
 * Check if a workflow has nodes
 */
export function hasNodes(workflow: SimpleWorkflow): boolean {
	return workflow.nodes.length > 0;
}
