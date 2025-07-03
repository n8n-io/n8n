import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { WorkflowState } from '../workflow-state';
import { isSubNode } from '../utils/node-helpers';

const nodeSchema = z.object({
	nodeType: z.string().describe('The type of node to add (e.g., n8n-nodes-base.httpRequest)'),
	name: z
		.string()
		.describe('A descriptive name for the node that clearly indicates its purpose in the workflow'),
	// position: z.array(z.number()).optional().describe('Position of the node [x, y] (optional - will auto-position if not provided)'),
});

const addNodesSchema = z.object({
	nodes: z.array(nodeSchema).describe('Array of nodes to add to the workflow'),
});

export const createAddNodeTool = (nodeTypes: INodeTypeDescription[]) => {
	return tool(
		async (input, config) => {
			const { nodes } = input;
			const state = getCurrentTaskInput() as typeof WorkflowState.State;

			const addedNodes: INode[] = [];
			const errors: string[] = [];
			let currentNodes = [...state.workflowJSON.nodes];

			// Process each node in the array
			for (const nodeInput of nodes) {
				const { nodeType, name } = nodeInput;

				// Find the node type
				const nodeTypeDesc = nodeTypes.find((nt) => nt.name === nodeType);
				if (!nodeTypeDesc) {
					errors.push(`Node type "${nodeType}" not found`);
					continue;
				}

				// Create the new node with updated state context
				const newNode = createNode(
					nodeTypeDesc,
					name,
					{
						...state,
						workflowJSON: { ...state.workflowJSON, nodes: currentNodes },
					},
					nodeTypes,
				);

				addedNodes.push(newNode);
				currentNodes.push(newNode);
			}

			// If all nodes failed to add, return error
			if (addedNodes.length === 0 && errors.length > 0) {
				return new Command({
					update: {
						messages: [
							new ToolMessage({
								content: `Failed to add nodes: ${errors.join(', ')}. Please search for available nodes first.`,
								tool_call_id: config.toolCall?.id,
							}),
						],
					},
				});
			}

			// Create updated workflow JSON
			const updatedWorkflowJSON = {
				...state.workflowJSON,
				nodes: currentNodes,
			};

			// Build success message
			const successMessages = addedNodes
				.map((node) => {
					const nodeTypeDesc = nodeTypes.find((nt) => nt.name === node.type);
					return `- "${node.name}" (${nodeTypeDesc?.displayName || node.type}) with ID ${node.id}}]`;
				})
				.join('\n');

			let responseMessage = `Successfully added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}:\n${successMessages}`;
			if (errors.length > 0) {
				responseMessage += `\n\nErrors:\n${errors.join('\n')}`;
			}

			// Return Command with state update
			return new Command({
				update: {
					workflowJSON: updatedWorkflowJSON,
					messages: [
						new ToolMessage({
							content: responseMessage,
							tool_call_id: config.toolCall?.id,
						}),
					],
				},
			});
		},
		{
			name: 'add_nodes',
			description:
				'Add one or more nodes to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what each node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.',
			schema: addNodesSchema,
		},
	);
};

function createNode(
	nodeType: INodeTypeDescription,
	customName: string | undefined,
	state: typeof WorkflowState.State,
	nodeTypes: INodeTypeDescription[],
): INode {
	// Generate unique ID
	const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

	// Determine node name
	const baseName = customName || nodeType.defaults?.name || nodeType.displayName;
	const name = generateUniqueName(baseName, state.workflowJSON.nodes);

	// Check if this is a sub-node
	const isSubNodeType = isSubNode(nodeType);

	// Calculate position
	const position = calculateNodePosition(state.workflowJSON.nodes, isSubNodeType, nodeTypes);

	// Get latest version
	const typeVersion = getLatestVersion(nodeType);

	// Create the node
	const node: INode = {
		id: nodeId,
		name,
		type: nodeType.name,
		typeVersion,
		position: [position[0], position[1]],
		// parameters: mergeWithDefaults(parameters, nodeType),
		parameters: {},
	};

	// Add optional properties
	if (nodeType.webhooks && nodeType.webhooks.length > 0) {
		(node as any).webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	return node;
}

function generateUniqueName(baseName: string, existingNodes: INode[]): string {
	let uniqueName = baseName;
	let counter = 1;

	while (existingNodes.some((n) => n.name === uniqueName)) {
		uniqueName = `${baseName}${counter}`;
		counter++;
	}

	return uniqueName;
}

function calculateNodePosition(
	existingNodes: INode[],
	isSubNodeType: boolean,
	nodeTypes: INodeTypeDescription[],
): [number, number] {
	const HORIZONTAL_GAP = 280; // Gap between columns of nodes
	const MAIN_NODE_Y = 300; // Y position for main nodes
	const SUB_NODE_Y = 450; // Y position for sub-nodes (below main nodes but not too far)
	const VERTICAL_SPACING = 120; // Spacing between nodes in the same column

	if (existingNodes.length === 0) {
		// First node - position based on whether it's a sub-node or main node
		return [250, isSubNodeType ? SUB_NODE_Y : MAIN_NODE_Y];
	}

	// Separate existing nodes into main and sub-nodes
	const existingMainNodes = existingNodes.filter((node) => {
		const nodeType = nodeTypes.find((nt) => nt.name === node.type);
		return nodeType && !isSubNode(nodeType);
	});

	const existingSubNodes = existingNodes.filter((node) => {
		const nodeType = nodeTypes.find((nt) => nt.name === node.type);
		return nodeType && isSubNode(nodeType);
	});

	// Find the rightmost X position for the relevant node type
	let targetX;

	if (isSubNodeType) {
		// For sub-nodes, we want to position them under their related main nodes
		// If there are main nodes, position sub-nodes starting from the first main node's X
		if (existingMainNodes.length > 0) {
			const minMainX = Math.min(...existingMainNodes.map((n) => n.position[0]));
			// Calculate how many sub-nodes we already have
			const subNodeCount = existingSubNodes.length;
			// Position sub-nodes horizontally spread out under main nodes
			targetX = minMainX + subNodeCount * (HORIZONTAL_GAP * 0.8);
		} else {
			// No main nodes yet, use default positioning
			targetX = 250;
		}
	} else {
		// For main nodes, position to the right of all existing main nodes
		if (existingMainNodes.length > 0) {
			const maxMainX = Math.max(...existingMainNodes.map((n) => n.position[0]));
			targetX = maxMainX + HORIZONTAL_GAP;
		} else {
			// First main node
			targetX = 250;
		}
	}

	// For the new node, determine its base Y position
	const baseY = isSubNodeType ? SUB_NODE_Y : MAIN_NODE_Y;

	// Check how many nodes are already at the target X position
	const nodesAtTargetX = existingNodes.filter((n) => Math.abs(n.position[0] - targetX) < 50);

	// Add vertical offset if there are already nodes at this X position
	const verticalOffset = nodesAtTargetX.length > 0 ? nodesAtTargetX.length * VERTICAL_SPACING : 0;

	return [targetX, baseY + verticalOffset];
}

function getLatestVersion(nodeType: INodeTypeDescription): number {
	return (
		nodeType.defaultVersion ||
		(typeof nodeType.version === 'number'
			? nodeType.version
			: nodeType.version[nodeType.version.length - 1])
	);
}
