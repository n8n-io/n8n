import { tool } from '@langchain/core/tools';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { addNodesSchema, type AddedNode } from './types/node.types';
import { createNodeInstance, generateUniqueName } from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import { isSubNode } from '../utils/node-helpers';
import { createProgressReporter, createBatchProgressReporter, ToolError } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, addNodesToWorkflow, getWorkflowState } from './helpers/state';
import { findNodeType } from './helpers/validation';

/**
 * Output type for the add nodes tool
 */
interface AddNodesOutput {
	addedNodes: AddedNode[];
	errors: string[];
	totalRequested: number;
	successCount: number;
	message: string;
}

/**
 * Create a new node with proper positioning and naming
 */
function createNode(
	nodeType: INodeTypeDescription,
	customName: string,
	existingNodes: INode[],
	nodeTypes: INodeTypeDescription[],
): INode {
	// Generate unique name
	const baseName = customName ?? nodeType.defaults?.name ?? nodeType.displayName;
	const uniqueName = generateUniqueName(baseName, existingNodes);

	// Calculate position
	const position = calculateNodePosition(existingNodes, isSubNode(nodeType), nodeTypes);

	// Create the node instance
	return createNodeInstance(nodeType, uniqueName, position);
}

/**
 * Build the response message for added nodes
 */
function buildResponseMessage(
	addedNodes: AddedNode[],
	errors: string[],
	nodeTypes: INodeTypeDescription[],
): string {
	const parts: string[] = [];

	// Success message
	if (addedNodes.length > 0) {
		parts.push(`Successfully added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}:`);

		for (const node of addedNodes) {
			const nodeType = nodeTypes.find((nt) => nt.name === node.type);
			const nodeTypeInfo = nodeType && isSubNode(nodeType) ? ' (sub-node)' : '';
			parts.push(
				`- "${node.name}" (${node.displayName ?? node.type})${nodeTypeInfo} with ID ${node.id}`,
			);
		}
	}

	// Error messages
	if (errors.length > 0) {
		if (parts.length > 0) parts.push('');
		parts.push('Errors:');
		errors.forEach((error) => parts.push(`- ${error}`));
	}

	return parts.join('\n');
}

/**
 * Factory function to create the add nodes tool
 */
export function createAddNodeTool(nodeTypes: INodeTypeDescription[]) {
	return tool(
		async (input: unknown, config) => {
			const reporter = createProgressReporter(config, 'add_nodes');

			try {
				// Validate input using Zod schema
				const validatedInput = addNodesSchema.parse(input);
				const { nodes } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				const addedNodes: INode[] = [];
				const addedNodeInfo: AddedNode[] = [];
				const errors: string[] = [];

				// Create a copy of current nodes to track additions
				const currentNodes = [...workflow.nodes];

				// Create batch reporter for progress tracking
				const batchReporter = createBatchProgressReporter(reporter, 'Adding nodes');
				batchReporter.init(nodes.length);

				// Process each node in the array
				for (let i = 0; i < nodes.length; i++) {
					const nodeInput = nodes[i];
					const { nodeType, name } = nodeInput;

					// Report progress
					batchReporter.next(name);

					// Find the node type
					const nodeTypeDesc = findNodeType(nodeType, nodeTypes);
					if (!nodeTypeDesc) {
						errors.push(`Node type "${nodeType}" not found`);
						continue;
					}

					// Create the new node
					const newNode = createNode(nodeTypeDesc, name, currentNodes, nodeTypes);

					addedNodes.push(newNode);
					addedNodeInfo.push({
						id: newNode.id,
						name: newNode.name,
						type: newNode.type,
						displayName: nodeTypeDesc.displayName,
						position: newNode.position,
					});
					currentNodes.push(newNode);
				}

				// Complete batch reporting
				batchReporter.complete();

				// Check if all nodes failed
				if (addedNodes.length === 0 && errors.length > 0) {
					const error = {
						message: `Failed to add nodes: ${errors.join(', ')}`,
						code: 'ALL_NODES_FAILED',
						details: { errors },
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Build success message
				const message = buildResponseMessage(addedNodeInfo, errors, nodeTypes);

				// Report completion
				const output: AddNodesOutput = {
					addedNodes: addedNodeInfo,
					errors,
					totalRequested: nodes.length,
					successCount: addedNodes.length,
					message,
				};
				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = addNodesToWorkflow(state, addedNodes);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				const toolError: ToolError = {
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
					details: error instanceof z.ZodError ? error.errors : undefined,
				};

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'add_nodes',
			description:
				'Add one or more nodes to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what each node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.',
			schema: addNodesSchema,
		},
	);
}
