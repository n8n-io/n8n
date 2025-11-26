import type {
	INode,
	INodeTypeDescription,
	IConnections,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type {
	ConnectionValidationResult,
	InferConnectionTypeResult,
} from '../../types/connections';
import { isSubNode } from '../../utils/node-helpers';
/**
 * Extract connection types from an expression string
 * Looks for patterns like type: "ai_embedding", type: 'main', etc.
 * Also detects array patterns like ["main", ...] or ['main', ...]
 * @param expression - The expression string to parse
 * @returns Array of unique connection types found
 */
function extractConnectionTypesFromExpression(expression: string): NodeConnectionType[] {
	const types = new Set<string>();

	// Pattern to match type: "value" or type: 'value' or type: NodeConnectionTypes.Value
	const patterns = [/type\s*:\s*["']([^"']+)["']/g, /type\s*:\s*NodeConnectionTypes\.(\w+)/g];

	// Additional patterns to detect "main" in arrays
	const arrayMainPatterns = [
		/\[\s*["']main["']/i, // ["main" or ['main'
		/\[\s*NodeConnectionTypes\.Main/i, // [NodeConnectionTypes.Main
		/return\s+\[\s*["']main["']/i, // return ["main" or return ['main'
		/return\s+\[\s*NodeConnectionTypes\.Main/i, // return [NodeConnectionTypes.Main
	];

	// Check for array patterns containing "main"
	for (const pattern of arrayMainPatterns) {
		if (pattern.test(expression)) {
			types.add(NodeConnectionTypes.Main);
			break;
		}
	}

	for (const pattern of patterns) {
		let match;
		pattern.lastIndex = 0; // Reset regex state
		while ((match = pattern.exec(expression)) !== null) {
			const type = match[1];
			if (type) {
				// Convert lowercase 'main' to proper case if needed
				const normalizedType = type.toLowerCase() === 'main' ? NodeConnectionTypes.Main : type;
				types.add(normalizedType);
			}
		}
	}

	return Array.from(types) as NodeConnectionType[];
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

	const sourceIsSubNode = isSubNode(sourceNodeType, sourceNode);
	const targetIsSubNode = isSubNode(targetNodeType, targetNode);

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
	if (typeof nodeType.outputs === 'string') {
		return nodeType.outputs === connectionType || nodeType.outputs.includes(connectionType);
	}

	if (!nodeType.outputs || !Array.isArray(nodeType.outputs)) {
		return false;
	}

	return nodeType.outputs.some((output) => {
		if (typeof output === 'string') {
			return output === connectionType || output.includes(connectionType);
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
	if (typeof nodeType.inputs === 'string') {
		return nodeType.inputs === connectionType || nodeType.inputs.includes(connectionType);
	}

	if (!nodeType.inputs || !Array.isArray(nodeType.inputs)) {
		return false;
	}

	return nodeType.inputs.some((input) => {
		if (typeof input === 'string') {
			return input === connectionType || input.includes(connectionType);
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
	connectionType: NodeConnectionType,
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
		type: connectionType,
		index: targetInputIndex,
	};

	// Ensure the array at sourceOutputIndex exists
	connectionArray[sourceOutputIndex] ??= [];

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

/**
 * Get all output types from a node
 * @param nodeType - The node type description
 * @returns Array of output types the node supports
 */
function getNodeOutputTypes(nodeType: INodeTypeDescription): NodeConnectionType[] {
	// Handle expression-based outputs
	if (typeof nodeType.outputs === 'string') {
		// console.log(`[getNodeOutputTypes] Expression-based outputs for ${nodeType.name}`);
		const extracted = extractConnectionTypesFromExpression(nodeType.outputs);
		if (extracted.length > 0) {
			return extracted;
		}
		// If no types found in expression, return empty array
		// console.log('[getNodeOutputTypes] No types found in expression');
		return [];
	}

	if (!nodeType.outputs || !Array.isArray(nodeType.outputs)) {
		return [];
	}

	return nodeType.outputs.map((output) => {
		if (typeof output === 'string') {
			return output;
		}
		return output.type;
	});
}

/**
 * Get all input types from a node
 * @param nodeType - The node type description
 * @returns Array of input types the node accepts
 */
function getNodeInputTypes(nodeType: INodeTypeDescription, node?: INode): NodeConnectionType[] {
	// Handle expression-based inputs
	if (typeof nodeType.inputs === 'string') {
		// console.log(`[getNodeInputTypes] Expression-based inputs for ${nodeType.name}`);

		// Special handling for Vector Store in retrieve-as-tool mode
		// When in this mode, it only accepts AI inputs (no main input)
		if (
			node &&
			nodeType.name.includes('vectorStore') &&
			node.parameters?.mode === 'retrieve-as-tool'
		) {
			// console.log('[getNodeInputTypes] Vector Store in retrieve-as-tool mode - only AI inputs');
			// Extract only AI connection types from the expression
			const extracted = extractConnectionTypesFromExpression(nodeType.inputs);
			return extracted.filter((type) => type.startsWith('ai_'));
		}

		const extracted = extractConnectionTypesFromExpression(nodeType.inputs);
		if (extracted.length > 0) {
			return extracted;
		}
		// If no types found in expression, return empty array
		// console.log('[getNodeInputTypes] No types found in expression');
		return [];
	}

	if (!nodeType.inputs || !Array.isArray(nodeType.inputs)) {
		return [];
	}

	return nodeType.inputs.map((input) => {
		if (typeof input === 'string') {
			return input;
		}
		return input.type;
	});
}

/**
 * Infer the connection type between two nodes based on their inputs and outputs
 * @param sourceNode - The source node
 * @param targetNode - The target node
 * @param sourceNodeType - The source node type description
 * @param targetNodeType - The target node type description
 * @returns The inferred connection type or possible types
 */
// eslint-disable-next-line complexity
export function inferConnectionType(
	sourceNode: INode,
	targetNode: INode,
	sourceNodeType: INodeTypeDescription,
	targetNodeType: INodeTypeDescription,
): InferConnectionTypeResult {
	// Get available output and input types
	const sourceOutputTypes = getNodeOutputTypes(sourceNodeType);
	const targetInputTypes = getNodeInputTypes(targetNodeType, targetNode);
	const sourceInputTypes = getNodeInputTypes(sourceNodeType, sourceNode);

	// For nodes with dynamic inputs/outputs, check if they're currently acting as sub-nodes
	// A node acts as a sub-node if it currently has no main inputs based on its parameters
	const sourceHasMainInput = sourceInputTypes.includes(NodeConnectionTypes.Main);
	const targetHasMainInput = targetInputTypes.includes(NodeConnectionTypes.Main);

	// Use the dynamic check for nodes with expression-based inputs
	const sourceIsSubNode =
		isSubNode(sourceNodeType, sourceNode) ||
		(typeof sourceNodeType.inputs === 'string' && !sourceHasMainInput);

	const targetIsSubNode =
		isSubNode(targetNodeType, targetNode) ||
		(typeof targetNodeType.inputs === 'string' && !targetHasMainInput);

	// Find matching connection types
	const matchingTypes = sourceOutputTypes.filter((outputType) =>
		targetInputTypes.includes(outputType),
	);

	// console.log(`Matching types: [${matchingTypes.join(', ')}]`);

	// Handle AI connections (sub-node to main node)
	if (sourceIsSubNode && !targetIsSubNode) {
		// console.log('Scenario: Sub-node to main node (AI connection)');
		// Find AI connection types in the matches
		const aiConnectionTypes = matchingTypes.filter((type) => type.startsWith('ai_'));

		if (aiConnectionTypes.length === 1) {
			return { connectionType: aiConnectionTypes[0] };
		} else if (aiConnectionTypes.length > 1) {
			// Multiple AI connection types possible
			return {
				possibleTypes: aiConnectionTypes,
				error: `Multiple AI connection types possible: ${aiConnectionTypes.join(', ')}. Please specify which one to use.`,
			};
		}
	}

	// Handle reversed AI connections (main node to sub-node - needs swap)
	if (!sourceIsSubNode && targetIsSubNode) {
		// console.log('Scenario: Main node to sub-node (needs swap)');
		// Check if target has any AI outputs that source accepts as inputs
		const targetOutputTypes = getNodeOutputTypes(targetNodeType);
		const sourceInputTypes = getNodeInputTypes(sourceNodeType, sourceNode);

		const reverseAiMatches = targetOutputTypes
			.filter((type) => type.startsWith('ai_'))
			.filter((type) => sourceInputTypes.includes(type));

		if (reverseAiMatches.length === 1) {
			return {
				connectionType: reverseAiMatches[0],
				requiresSwap: true,
			};
		} else if (reverseAiMatches.length > 1) {
			return {
				possibleTypes: reverseAiMatches,
				requiresSwap: true,
				error: `Multiple AI connection types possible (requires swap): ${reverseAiMatches.join(', ')}. Please specify which one to use.`,
			};
		}
	}

	// Handle main connections
	if (!sourceIsSubNode && !targetIsSubNode) {
		if (matchingTypes.includes(NodeConnectionTypes.Main)) {
			return { connectionType: NodeConnectionTypes.Main };
		}
	}

	// Handle sub-node to sub-node connections
	if (sourceIsSubNode && targetIsSubNode) {
		// Check for AI document connections or other specific sub-node to sub-node connections
		const subNodeConnections = matchingTypes.filter((type) => type.startsWith('ai_'));

		if (subNodeConnections.length === 1) {
			return { connectionType: subNodeConnections[0] };
		} else if (subNodeConnections.length > 1) {
			return {
				possibleTypes: subNodeConnections,
				error: `Multiple connection types possible between sub-nodes: ${subNodeConnections.join(', ')}. Please specify which one to use.`,
			};
		}
	}

	// No valid connection found
	if (matchingTypes.length === 0) {
		return {
			error: `No compatible connection types found between "${sourceNode.name}" (outputs: ${sourceOutputTypes.join(', ') || 'none'}) and "${targetNode.name}" (inputs: ${targetInputTypes.join(', ') || 'none'})`,
		};
	}

	// If we have other matching types but couldn't determine the best one
	if (matchingTypes.length === 1) {
		return { connectionType: matchingTypes[0] };
	}

	return {
		possibleTypes: matchingTypes,
		error: `Multiple connection types possible: ${matchingTypes.join(', ')}. Please specify which one to use.`,
	};
}
