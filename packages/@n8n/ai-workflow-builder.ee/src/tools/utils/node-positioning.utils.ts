import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { isSubNode } from '../../utils/node-helpers';

/**
 * Constants for node positioning
 */
export const POSITIONING_CONFIG = {
	HORIZONTAL_GAP: 280, // Gap between columns of nodes
	MAIN_NODE_Y: 300, // Y position for main nodes
	SUB_NODE_Y: 450, // Y position for sub-nodes (below main nodes but not too far)
	VERTICAL_SPACING: 120, // Spacing between nodes in the same column
	INITIAL_X: 250, // Starting X position
	X_PROXIMITY_THRESHOLD: 50, // Threshold for considering nodes at the same X position
	SUB_NODE_HORIZONTAL_OFFSET: 0.8, // Multiplier for sub-node horizontal spacing
} as const;

/**
 * Calculate position for a new node
 * @param existingNodes - Array of existing nodes in the workflow
 * @param isSubNodeType - Whether the new node is a sub-node
 * @param nodeTypes - Array of all node type descriptions
 * @returns The calculated position [x, y]
 */
export function calculateNodePosition(
	existingNodes: INode[],
	isSubNodeType: boolean,
	nodeTypes: INodeTypeDescription[],
): [number, number] {
	const { INITIAL_X, MAIN_NODE_Y, SUB_NODE_Y } = POSITIONING_CONFIG;

	if (existingNodes.length === 0) {
		// First node - position based on whether it's a sub-node or main node
		return [INITIAL_X, isSubNodeType ? SUB_NODE_Y : MAIN_NODE_Y];
	}

	// Separate existing nodes into main and sub-nodes
	const { mainNodes, subNodes } = categorizeNodes(existingNodes, nodeTypes);

	// Calculate X position
	const targetX = calculateXPosition(isSubNodeType, mainNodes, subNodes);

	// Calculate Y position
	const targetY = calculateYPosition(targetX, existingNodes, isSubNodeType);

	return [targetX, targetY];
}

/**
 * Categorize nodes into main and sub-nodes
 * @param nodes - Array of nodes to categorize
 * @param nodeTypes - Array of all node type descriptions
 * @returns Object with mainNodes and subNodes arrays
 */
export function categorizeNodes(
	nodes: INode[],
	nodeTypes: INodeTypeDescription[],
): { mainNodes: INode[]; subNodes: INode[] } {
	const mainNodes: INode[] = [];
	const subNodes: INode[] = [];

	for (const node of nodes) {
		const nodeType = nodeTypes.find((nt) => nt.name === node.type);
		if (nodeType && isSubNode(nodeType, node)) {
			subNodes.push(node);
		} else {
			mainNodes.push(node);
		}
	}

	return { mainNodes, subNodes };
}

/**
 * Calculate the X position for a new node
 * @param isSubNodeType - Whether the new node is a sub-node
 * @param mainNodes - Array of existing main nodes
 * @param subNodes - Array of existing sub-nodes
 * @returns The calculated X position
 */
function calculateXPosition(isSubNodeType: boolean, mainNodes: INode[], subNodes: INode[]): number {
	const { HORIZONTAL_GAP, INITIAL_X, SUB_NODE_HORIZONTAL_OFFSET } = POSITIONING_CONFIG;

	if (isSubNodeType) {
		// For sub-nodes, position them under their related main nodes
		if (mainNodes.length > 0) {
			const minMainX = Math.min(...mainNodes.map((n) => n.position[0]));
			// Position sub-nodes horizontally spread out under main nodes
			return minMainX + subNodes.length * (HORIZONTAL_GAP * SUB_NODE_HORIZONTAL_OFFSET);
		}
		// No main nodes yet, use default positioning
		return INITIAL_X;
	} else {
		// For main nodes, position to the right of all existing main nodes
		if (mainNodes.length > 0) {
			const maxMainX = Math.max(...mainNodes.map((n) => n.position[0]));
			return maxMainX + HORIZONTAL_GAP;
		}
		// First main node
		return INITIAL_X;
	}
}

/**
 * Calculate the Y position for a new node
 * @param targetX - The calculated X position
 * @param existingNodes - Array of existing nodes
 * @param isSubNodeType - Whether the new node is a sub-node
 * @returns The calculated Y position
 */
function calculateYPosition(
	targetX: number,
	existingNodes: INode[],
	isSubNodeType: boolean,
): number {
	const { MAIN_NODE_Y, SUB_NODE_Y, VERTICAL_SPACING, X_PROXIMITY_THRESHOLD } = POSITIONING_CONFIG;

	// Determine base Y position
	const baseY = isSubNodeType ? SUB_NODE_Y : MAIN_NODE_Y;

	// Check how many nodes are already at the target X position
	const nodesAtTargetX = existingNodes.filter(
		(n) => Math.abs(n.position[0] - targetX) < X_PROXIMITY_THRESHOLD,
	);

	// Add vertical offset if there are already nodes at this X position
	const verticalOffset = nodesAtTargetX.length * VERTICAL_SPACING;

	return baseY + verticalOffset;
}

/**
 * Get nodes at a specific position (with tolerance)
 * @param nodes - Array of nodes to check
 * @param position - The position to check [x, y]
 * @param tolerance - Position tolerance (default: 50)
 * @returns Array of nodes at the position
 */
export function getNodesAtPosition(
	nodes: INode[],
	position: [number, number],
	tolerance: number = 50,
): INode[] {
	return nodes.filter(
		(node) =>
			Math.abs(node.position[0] - position[0]) < tolerance &&
			Math.abs(node.position[1] - position[1]) < tolerance,
	);
}

/**
 * Find the best position for a node connected to another node
 * @param sourceNode - The source node
 * @param isTargetSubNode - Whether the target node is a sub-node
 * @param existingNodes - Array of existing nodes
 * @param nodeTypes - Array of all node type descriptions
 * @returns The calculated position [x, y]
 */
export function calculateConnectedNodePosition(
	sourceNode: INode,
	isTargetSubNode: boolean,
	existingNodes: INode[],
	_nodeTypes: INodeTypeDescription[],
): [number, number] {
	const { HORIZONTAL_GAP, SUB_NODE_Y, VERTICAL_SPACING } = POSITIONING_CONFIG;

	if (isTargetSubNode) {
		// Position sub-nodes below the source node
		const targetX = sourceNode.position[0];
		const targetY = SUB_NODE_Y;

		// Check for existing sub-nodes at this position
		const existingSubNodes = existingNodes.filter(
			(node) =>
				Math.abs(node.position[0] - targetX) < 50 &&
				node.position[1] >= SUB_NODE_Y &&
				node.position[1] < SUB_NODE_Y + VERTICAL_SPACING * 5,
		);

		return [targetX, targetY + existingSubNodes.length * VERTICAL_SPACING];
	} else {
		// Position main nodes to the right
		const targetX = sourceNode.position[0] + HORIZONTAL_GAP;
		const targetY = sourceNode.position[1];

		// Check for existing nodes at this position
		const nodesAtPosition = getNodesAtPosition(existingNodes, [targetX, targetY]);

		return [targetX, targetY + nodesAtPosition.length * VERTICAL_SPACING];
	}
}
