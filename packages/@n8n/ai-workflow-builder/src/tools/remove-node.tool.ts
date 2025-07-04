import type { INodeTypeDescription } from 'n8n-workflow';

import { BaseWorkflowBuilderTool, z, type ToolContext, type ToolResult } from './base';
import type { WorkflowState } from '../workflow-state';

/**
 * Schema for the remove node tool
 */
const removeNodeSchema = z.object({
	nodeId: z.string().describe('The ID of the node to remove from the workflow'),
});

/**
 * Inferred type from schema
 */
type RemoveNodeInput = z.infer<typeof removeNodeSchema>;

/**
 * Output type for the remove node tool
 */
interface RemoveNodeOutput {
	removedNodeId: string;
	removedNodeName: string;
	removedNodeType: string;
	connectionsRemoved: number;
	message: string;
}

/**
 * Remove node tool implementation using the base infrastructure
 */
export class RemoveNodeTool extends BaseWorkflowBuilderTool<
	typeof removeNodeSchema,
	RemoveNodeOutput
> {
	protected readonly schema = removeNodeSchema;
	protected readonly name = 'remove_node' as const;
	protected readonly description =
		'Remove a node from the workflow by its ID. This will also remove all connections to and from the node. Use this tool when you need to delete a node that is no longer needed in the workflow.';

	/**
	 * Execute the remove node tool
	 */
	protected async execute(
		input: RemoveNodeInput,
		context: ToolContext,
	): Promise<ToolResult<RemoveNodeOutput>> {
		const { nodeId } = input;
		const state = context.getCurrentTaskInput() as typeof WorkflowState.State;

		// Report progress
		context.reporter.progress(`Removing node ${nodeId}`);

		// Find the node to remove
		const nodeToRemove = state.workflowJSON.nodes.find((node) => node.id === nodeId);

		if (!nodeToRemove) {
			return {
				success: false,
				error: {
					message: `Node with ID "${nodeId}" not found in the workflow`,
					code: 'NODE_NOT_FOUND',
					details: { nodeId },
				},
			};
		}

		// Filter out the node from the nodes array
		const updatedNodes = state.workflowJSON.nodes.filter((node) => node.id !== nodeId);

		// Count connections that will be removed
		let connectionsRemoved = 0;
		const updatedConnections = { ...state.workflowJSON.connections };

		// Remove connections where the node is the source
		if (updatedConnections[nodeId]) {
			// Count all connections from this node
			for (const connectionType of Object.values(updatedConnections[nodeId])) {
				if (Array.isArray(connectionType)) {
					for (const outputs of connectionType) {
						if (Array.isArray(outputs)) {
							connectionsRemoved += outputs.length;
						}
					}
				}
			}
			delete updatedConnections[nodeId];
		}

		// Remove connections where the node is the target
		for (const [_sourceNodeId, nodeConnections] of Object.entries(updatedConnections)) {
			for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
				if (Array.isArray(outputs)) {
					const updatedOutputs = outputs.map((outputConnections) => {
						if (Array.isArray(outputConnections)) {
							const filtered = outputConnections.filter((conn) => conn.node !== nodeId);
							connectionsRemoved += outputConnections.length - filtered.length;
							return filtered;
						}
						return outputConnections;
					});

					// Update the connections
					(nodeConnections as any)[connectionType] = updatedOutputs;
				}
			}
		}

		// Build success message
		const message = this.buildResponseMessage(
			nodeToRemove.name,
			nodeToRemove.type,
			connectionsRemoved,
		);

		// Return success with state updates
		return {
			success: true,
			data: {
				removedNodeId: nodeId,
				removedNodeName: nodeToRemove.name,
				removedNodeType: nodeToRemove.type,
				connectionsRemoved,
				message,
			},
			stateUpdates: {
				workflowJSON: {
					...state.workflowJSON,
					nodes: updatedNodes,
					connections: updatedConnections,
				},
			},
		};
	}

	/**
	 * Build the response message for the removed node
	 */
	private buildResponseMessage(
		nodeName: string,
		nodeType: string,
		connectionsRemoved: number,
	): string {
		const parts: string[] = [`Successfully removed node "${nodeName}" (${nodeType})`];

		if (connectionsRemoved > 0) {
			parts.push(`Removed ${connectionsRemoved} connection${connectionsRemoved > 1 ? 's' : ''}`);
		}

		return parts.join('\n');
	}

	/**
	 * Override to provide custom success message
	 */
	protected formatSuccessMessage(output: RemoveNodeOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the remove node tool
 * Maintains backward compatibility with existing code
 */
export function createRemoveNodeTool(nodeTypes: INodeTypeDescription[]) {
	const tool = new RemoveNodeTool(nodeTypes);
	return tool.createLangChainTool();
}
