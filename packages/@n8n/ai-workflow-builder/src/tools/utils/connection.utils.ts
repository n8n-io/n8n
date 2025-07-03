import type { INode, INodeTypeDescription, IConnections, IConnection } from 'n8n-workflow';

import { isSubNode } from '../../utils/node-helpers';

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
 * Validate if a connection between two nodes is valid
 * @param sourceNode - The source node
 * @param targetNode - The target node
 * @param connectionType - The type of connection
 * @param nodeTypes - Array of all node type descriptions
 * @returns Validation result with potential swap recommendation
 */
export function validateConnection(
	sourceNode: INode,
	targetNode: INode,
	connectionType: string,
	nodeTypes: INodeTypeDescription[],
): ConnectionValidationResult {
	const sourceNodeType = nodeTypes.find((nt) => nt.name === sourceNode.type);
	const targetNodeType = nodeTypes.find((nt) => nt.name === targetNode.type);

	if (!sourceNodeType || !targetNodeType) {
		return {
			valid: false,
			error: 'One or both node types not found',
		};
	}

	const sourceIsSubNode = isSubNode(sourceNodeType);
	const targetIsSubNode = isSubNode(targetNodeType);

	// For AI connections, validate and potentially suggest swapping
	if (connectionType.startsWith('ai_')) {
		// AI connections require a sub-node
		if (!sourceIsSubNode && !targetIsSubNode) {
			return {
				valid: false,
				error: `Connection type "${connectionType}" requires a sub-node, but both nodes are main nodes`,
			};
		}

		// If target is sub-node but source is not, suggest swapping
		if (targetIsSubNode && !sourceIsSubNode) {
			return {
				valid: true,
				shouldSwap: true,
				swappedSource: targetNode,
				swappedTarget: sourceNode,
			};
		}

		// Validate that the sub-node supports the connection type
		if (sourceIsSubNode) {
			const supportsConnectionType = nodeHasOutputType(sourceNodeType, connectionType);
			if (!supportsConnectionType) {
				return {
					valid: false,
					error: `Sub-node "${sourceNode.name}" does not support output type "${connectionType}"`,
				};
			}
		}
	}

	return { valid: true };
}

/**
 * Check if a node has a specific output type
 * @param nodeType - The node type description
 * @param connectionType - The connection type to check
 * @returns True if the node supports the output type
 */
export function nodeHasOutputType(nodeType: INodeTypeDescription, connectionType: string): boolean {
	if (!nodeType.outputs || !Array.isArray(nodeType.outputs)) {
		return false;
	}

	return nodeType.outputs.some((output) => {
		if (typeof output === 'string') {
			return output === connectionType;
		}
		return output.type === connectionType;
	});
}

/**
 * Check if a node accepts a specific input type
 * @param nodeType - The node type description
 * @param connectionType - The connection type to check
 * @returns True if the node accepts the input type
 */
export function nodeAcceptsInputType(
	nodeType: INodeTypeDescription,
	connectionType: string,
): boolean {
	if (!nodeType.inputs || !Array.isArray(nodeType.inputs)) {
		return false;
	}

	return nodeType.inputs.some((input) => {
		if (typeof input === 'string') {
			return input === connectionType;
		}
		return input.type === connectionType;
	});
}

/**
 * Create or update a connection in the workflow
 * @param connections - Current connections object
 * @param sourceNodeName - Name of the source node
 * @param targetNodeName - Name of the target node
 * @param connectionType - Type of connection
 * @param sourceOutputIndex - Output index on source node (default: 0)
 * @param targetInputIndex - Input index on target node (default: 0)
 * @returns Updated connections object
 */
export function createConnection(
	connections: IConnections,
	sourceNodeName: string,
	targetNodeName: string,
	connectionType: string,
	sourceOutputIndex: number = 0,
	targetInputIndex: number = 0,
): IConnections {
	// Ensure source node exists in connections
	if (!connections[sourceNodeName]) {
		connections[sourceNodeName] = {};
	}

	// Ensure connection type exists
	if (!connections[sourceNodeName][connectionType]) {
		connections[sourceNodeName][connectionType] = [];
	}

	const connectionArray = connections[sourceNodeName][connectionType];

	// Ensure the array has enough elements for the source output index
	while (connectionArray.length <= sourceOutputIndex) {
		connectionArray.push([]);
	}

	// Add the connection
	const newConnection: IConnection = {
		node: targetNodeName,
		type: connectionType as any,
		index: targetInputIndex,
	};

	// Ensure the array at sourceOutputIndex exists
	if (!connectionArray[sourceOutputIndex]) {
		connectionArray[sourceOutputIndex] = [];
	}

	// Check if connection already exists
	const existingConnection = connectionArray[sourceOutputIndex].find(
		(conn) => conn.node === targetNodeName && conn.index === targetInputIndex,
	);

	if (!existingConnection) {
		connectionArray[sourceOutputIndex].push(newConnection);
	}

	return connections;
}

/**
 * Remove a connection from the workflow
 * @param connections - Current connections object
 * @param sourceNodeName - Name of the source node
 * @param targetNodeName - Name of the target node
 * @param connectionType - Type of connection
 * @param sourceOutputIndex - Output index on source node
 * @param targetInputIndex - Input index on target node
 * @returns Updated connections object
 */
export function removeConnection(
	connections: IConnections,
	sourceNodeName: string,
	targetNodeName: string,
	connectionType: string,
	sourceOutputIndex?: number,
	targetInputIndex?: number,
): IConnections {
	if (!connections[sourceNodeName]?.[connectionType]) {
		return connections;
	}

	const connectionArray = connections[sourceNodeName][connectionType];

	// If indices are specified, remove specific connection
	if (sourceOutputIndex !== undefined) {
		if (connectionArray[sourceOutputIndex]) {
			connectionArray[sourceOutputIndex] = connectionArray[sourceOutputIndex].filter(
				(conn) =>
					conn.node !== targetNodeName ||
					(targetInputIndex !== undefined && conn.index !== targetInputIndex),
			);
		}
	} else {
		// Remove all connections to target node
		for (let i = 0; i < connectionArray.length; i++) {
			if (connectionArray[i]) {
				connectionArray[i] = connectionArray[i]!.filter((conn) => conn.node !== targetNodeName);
			}
		}
	}

	// Clean up empty arrays
	connections[sourceNodeName][connectionType] = connectionArray.filter(
		(arr) => arr && arr.length > 0,
	);

	// Clean up empty connection types
	if (connections[sourceNodeName][connectionType].length === 0) {
		delete connections[sourceNodeName][connectionType];
	}

	// Clean up empty source nodes
	if (Object.keys(connections[sourceNodeName]).length === 0) {
		delete connections[sourceNodeName];
	}

	return connections;
}

/**
 * Get all connections for a specific node
 * @param connections - Current connections object
 * @param nodeName - Name of the node
 * @param direction - 'source' for outgoing, 'target' for incoming
 * @returns Array of connections
 */
export function getNodeConnections(
	connections: IConnections,
	nodeName: string,
	direction: 'source' | 'target',
): Array<{ node: string; type: string; sourceIndex?: number; targetIndex?: number }> {
	const result: Array<{ node: string; type: string; sourceIndex?: number; targetIndex?: number }> =
		[];

	if (direction === 'source') {
		// Get outgoing connections
		const nodeConnections = connections[nodeName];
		if (nodeConnections) {
			for (const [connectionType, connectionArray] of Object.entries(nodeConnections)) {
				connectionArray.forEach((outputConnections, sourceIndex) => {
					if (outputConnections) {
						outputConnections.forEach((conn) => {
							result.push({
								node: conn.node,
								type: connectionType,
								sourceIndex,
								targetIndex: conn.index,
							});
						});
					}
				});
			}
		}
	} else {
		// Get incoming connections
		for (const [sourceNode, nodeConnections] of Object.entries(connections)) {
			for (const [connectionType, connectionArray] of Object.entries(nodeConnections)) {
				connectionArray.forEach((outputConnections, sourceIndex) => {
					if (outputConnections) {
						outputConnections.forEach((conn) => {
							if (conn.node === nodeName) {
								result.push({
									node: sourceNode,
									type: connectionType,
									sourceIndex,
									targetIndex: conn.index,
								});
							}
						});
					}
				});
			}
		}
	}

	return result;
}

/**
 * Format a connection for display
 * @param sourceNode - Source node name
 * @param targetNode - Target node name
 * @param connectionType - Connection type
 * @param swapped - Whether nodes were swapped
 * @returns Formatted connection message
 */
export function formatConnectionMessage(
	sourceNode: string,
	targetNode: string,
	connectionType: string,
	swapped: boolean = false,
): string {
	if (swapped) {
		return `Auto-corrected connection: ${sourceNode} (${connectionType}) → ${targetNode}. (Note: Swapped nodes to ensure sub-node is the source)`;
	}
	return `Connected: ${sourceNode} → ${targetNode} (${connectionType})`;
}
