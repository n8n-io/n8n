import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '../errors';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, removeNodeFromWorkflow } from './helpers/state';
import { validateNodeExists, createNodeNotFoundError } from './helpers/validation';
import type { RemoveNodeOutput } from '../types/tools';

/**
 * Schema for the remove node tool
 */
const removeNodeSchema = z.object({
	nodeId: z.string().describe('The ID of the node to remove from the workflow'),
});

/**
 * Count connections that will be removed for a node
 */
function countNodeConnections(nodeId: string, connections: IConnections): number {
	let count = 0;

	// Count outgoing connections
	if (connections[nodeId]) {
		for (const connectionType of Object.values(connections[nodeId])) {
			if (Array.isArray(connectionType)) {
				for (const outputs of connectionType) {
					if (Array.isArray(outputs)) {
						count += outputs.length;
					}
				}
			}
		}
	}

	// Count incoming connections
	for (const [_sourceNodeId, nodeConnections] of Object.entries(connections)) {
		for (const outputs of Object.values(nodeConnections)) {
			if (Array.isArray(outputs)) {
				for (const outputConnections of outputs) {
					if (Array.isArray(outputConnections)) {
						count += outputConnections.filter((conn) => conn.node === nodeId).length;
					}
				}
			}
		}
	}

	return count;
}

/**
 * Build the response message for the removed node
 */
function buildResponseMessage(
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
 * Factory function to create the remove node tool
 */
export function createRemoveNodeTool(_logger?: Logger) {
	const DISPLAY_TITLE = 'Removing node';

	const dynamicTool = tool(
		(input, config) => {
			const reporter = createProgressReporter(config, 'remove_node', DISPLAY_TITLE);

			try {
				// Validate input using Zod schema
				const validatedInput = removeNodeSchema.parse(input);
				const { nodeId } = validatedInput;

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report progress
				reportProgress(reporter, `Removing node ${nodeId}`);

				// Find the node to remove
				const nodeToRemove = validateNodeExists(nodeId, workflow.nodes);

				if (!nodeToRemove) {
					const error = createNodeNotFoundError(nodeId);
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Count connections that will be removed
				const connectionsRemoved = countNodeConnections(nodeId, workflow.connections);

				// Build success message
				const message = buildResponseMessage(
					nodeToRemove.name,
					nodeToRemove.type,
					connectionsRemoved,
				);

				// Report completion
				const output: RemoveNodeOutput = {
					removedNodeId: nodeId,
					removedNodeName: nodeToRemove.name,
					removedNodeType: nodeToRemove.type,
					connectionsRemoved,
					message,
				};
				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = removeNodeFromWorkflow(nodeId);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: 'remove_node',
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'remove_node',
			description:
				'Remove a node from the workflow by its ID. This will also remove all connections to and from the node. Use this tool when you need to delete a node that is no longer needed in the workflow.',
			schema: removeNodeSchema,
		},
	);

	return {
		tool: dynamicTool,
		displayTitle: DISPLAY_TITLE,
	};
}
