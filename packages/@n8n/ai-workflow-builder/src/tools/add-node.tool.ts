import type { INode, INodeTypeDescription } from 'n8n-workflow';

import type { z, BaseWorkflowBuilderTool, type ToolContext, type ToolResult } from './base';
import type { WorkflowState } from '../workflow-state';
import { addNodesSchema, type AddedNode } from './types/node.types';
import { createNodeInstance, generateUniqueName } from './utils/node-creation.utils';
import { calculateNodePosition } from './utils/node-positioning.utils';
import { isSubNode } from '../utils/node-helpers';

/**
 * Inferred type from schema
 */
type AddNodesInput = z.infer<typeof addNodesSchema>;

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
 * Add nodes tool implementation using the base infrastructure
 */
export class AddNodesTool extends BaseWorkflowBuilderTool<typeof addNodesSchema, AddNodesOutput> {
	protected readonly schema = addNodesSchema;
	protected readonly name = 'add_nodes' as const;
	protected readonly description =
		'Add one or more nodes to the workflow canvas. Each node represents a specific action or operation (e.g., HTTP request, data transformation, database query). Always provide descriptive names that explain what each node does (e.g., "Get Customer Data", "Filter Active Users", "Send Email Notification"). The tool handles automatic positioning. Use this tool after searching for available node types to ensure they exist.';

	/**
	 * Execute the add nodes tool
	 */
	protected async execute(
		input: AddNodesInput,
		context: ToolContext,
	): Promise<ToolResult<AddNodesOutput>> {
		const { nodes } = input;
		const state = context.getCurrentTaskInput() as typeof WorkflowState.State;

		const addedNodes: INode[] = [];
		const addedNodeInfo: AddedNode[] = [];
		const errors: string[] = [];

		// Create a copy of current nodes to track additions
		const currentNodes = [...state.workflowJSON.nodes];

		// Create batch reporter for progress tracking
		const batchReporter = context.reporter.createBatchReporter('Adding nodes');
		batchReporter.init(nodes.length);

		// Process each node in the array
		for (let i = 0; i < nodes.length; i++) {
			const nodeInput = nodes[i];
			const { nodeType, name } = nodeInput;

			// Report progress
			batchReporter.next(name);

			// Find the node type
			const nodeTypeDesc = context.nodeTypes.find((nt) => nt.name === nodeType);
			if (!nodeTypeDesc) {
				errors.push(`Node type "${nodeType}" not found`);
				continue;
			}

			// Create the new node
			const newNode = this.createNode(nodeTypeDesc, name, currentNodes, context.nodeTypes);

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
			return {
				success: false,
				error: {
					message: `Failed to add nodes: ${errors.join(', ')}`,
					code: 'ALL_NODES_FAILED',
					details: { errors },
				},
			};
		}

		// Build success message
		const message = this.buildResponseMessage(addedNodeInfo, errors, context.nodeTypes);

		// Return success with state updates
		return {
			success: true,
			data: {
				addedNodes: addedNodeInfo,
				errors,
				totalRequested: nodes.length,
				successCount: addedNodes.length,
				message,
			},
			stateUpdates: {
				workflowJSON: {
					...state.workflowJSON,
					nodes: currentNodes,
				},
			},
		};
	}

	/**
	 * Create a new node with proper positioning and naming
	 */
	private createNode(
		nodeType: INodeTypeDescription,
		customName: string,
		existingNodes: INode[],
		nodeTypes: INodeTypeDescription[],
	): INode {
		// Generate unique name
		const baseName = customName || nodeType.defaults?.name || nodeType.displayName;
		const uniqueName = generateUniqueName(baseName, existingNodes);

		// Calculate position
		const position = calculateNodePosition(existingNodes, isSubNode(nodeType), nodeTypes);

		// Create the node instance
		return createNodeInstance(nodeType, uniqueName, position);
	}

	/**
	 * Build the response message for added nodes
	 */
	private buildResponseMessage(
		addedNodes: AddedNode[],
		errors: string[],
		nodeTypes: INodeTypeDescription[],
	): string {
		const parts: string[] = [];

		// Success message
		if (addedNodes.length > 0) {
			parts.push(
				`Successfully added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}:`,
			);

			for (const node of addedNodes) {
				const nodeType = nodeTypes.find((nt) => nt.name === node.type);
				const nodeTypeInfo = nodeType && isSubNode(nodeType) ? ' (sub-node)' : '';
				parts.push(
					`- "${node.name}" (${node.displayName || node.type})${nodeTypeInfo} with ID ${node.id}`,
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
	 * Override to provide custom success message
	 */
	protected formatSuccessMessage(output: AddNodesOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the add nodes tool
 * Maintains backward compatibility with existing code
 */
export function createAddNodeTool(nodeTypes: INodeTypeDescription[]) {
	const tool = new AddNodesTool(nodeTypes);
	return tool.createLangChainTool();
}
