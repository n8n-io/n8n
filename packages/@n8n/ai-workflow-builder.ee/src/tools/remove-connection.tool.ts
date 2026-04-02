import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import { ConnectionError, NodeNotFoundError, ValidationError } from '../errors';
import type { RemoveConnectionOutput } from '../types/tools';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import {
	getCurrentWorkflow,
	getWorkflowState,
	removeConnectionFromWorkflow,
} from './helpers/state';
import { validateNodeExists } from './helpers/validation';

/**
 * Schema for removing a connection
 */
export const removeConnectionSchema = z.object({
	sourceNodeId: z
		.string()
		.describe('The UUID of the source node where the connection originates from'),
	targetNodeId: z.string().describe('The UUID of the target node where the connection goes to'),
	connectionType: z
		.string()
		.optional()
		.default('main')
		.describe('The type of connection to remove (default: "main")'),
	sourceOutputIndex: z
		.number()
		.optional()
		.default(0)
		.describe('The index of the output to disconnect from (default: 0)'),
	targetInputIndex: z
		.number()
		.optional()
		.default(0)
		.describe('The index of the input to disconnect from (default: 0)'),
});

export const REMOVE_CONNECTION_TOOL: BuilderToolBase = {
	toolName: 'remove_connection',
	displayTitle: 'Removing connection',
};

/**
 * Build the response message for the removed connection
 */
function buildResponseMessage(
	sourceNodeName: string,
	targetNodeName: string,
	connectionType: string,
	sourceOutputIndex: number,
	targetInputIndex: number,
): string {
	const parts: string[] = [
		`Successfully removed connection: ${sourceNodeName} → ${targetNodeName} (${connectionType})`,
	];

	if (sourceOutputIndex !== 0 || targetInputIndex !== 0) {
		parts.push(`Output index: ${sourceOutputIndex}, Input index: ${targetInputIndex}`);
	}

	return parts.join('\n');
}

/**
 * Factory function to create the remove connection tool
 */
export function createRemoveConnectionTool(logger?: Logger): BuilderTool {
	const dynamicTool = tool(
		(input, config) => {
			const reporter = createProgressReporter(
				config,
				REMOVE_CONNECTION_TOOL.toolName,
				REMOVE_CONNECTION_TOOL.displayTitle,
			);

			try {
				// Validate input using Zod schema
				const validatedInput = removeConnectionSchema.parse(input);

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report progress
				reportProgress(reporter, 'Finding nodes to disconnect...');

				// Find source and target nodes
				const sourceNode = validateNodeExists(validatedInput.sourceNodeId, workflow.nodes);
				const targetNode = validateNodeExists(validatedInput.targetNodeId, workflow.nodes);

				// Check if both nodes exist
				if (!sourceNode || !targetNode) {
					const missingNodeId = !sourceNode
						? validatedInput.sourceNodeId
						: validatedInput.targetNodeId;
					const nodeError = new NodeNotFoundError(missingNodeId);
					const error = {
						message: nodeError.message,
						code: 'NODES_NOT_FOUND',
						details: {
							sourceNodeId: validatedInput.sourceNodeId,
							targetNodeId: validatedInput.targetNodeId,
							foundSource: !!sourceNode,
							foundTarget: !!targetNode,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				logger?.debug('\n=== Remove Connection Tool ===');
				logger?.debug(
					`Attempting to remove connection: ${sourceNode.name} -> ${targetNode.name} (${validatedInput.connectionType})`,
				);

				// Report progress
				reportProgress(
					reporter,
					`Removing connection from ${sourceNode.name} to ${targetNode.name}...`,
				);

				// Check if the connection exists
				const sourceConnections = workflow.connections[sourceNode.name];
				if (!sourceConnections) {
					const connectionError = new ConnectionError(
						`Source node "${sourceNode.name}" has no outgoing connections`,
						{
							fromNodeId: sourceNode.id,
							toNodeId: targetNode.id,
						},
					);
					const error = {
						message: connectionError.message,
						code: 'CONNECTION_NOT_FOUND',
						details: {
							sourceNode: sourceNode.name,
							targetNode: targetNode.name,
							connectionType: validatedInput.connectionType,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const connectionTypeOutputs = sourceConnections[validatedInput.connectionType];
				if (!connectionTypeOutputs || !Array.isArray(connectionTypeOutputs)) {
					const connectionError = new ConnectionError(
						`Source node "${sourceNode.name}" has no connections of type "${validatedInput.connectionType}"`,
						{
							fromNodeId: sourceNode.id,
							toNodeId: targetNode.id,
						},
					);
					const error = {
						message: connectionError.message,
						code: 'CONNECTION_TYPE_NOT_FOUND',
						details: {
							sourceNode: sourceNode.name,
							targetNode: targetNode.name,
							connectionType: validatedInput.connectionType,
							availableConnectionTypes: Object.keys(sourceConnections),
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const outputConnections = connectionTypeOutputs[validatedInput.sourceOutputIndex];
				if (!outputConnections || !Array.isArray(outputConnections)) {
					const connectionError = new ConnectionError(
						`Source node "${sourceNode.name}" has no connections at output index ${validatedInput.sourceOutputIndex}`,
						{
							fromNodeId: sourceNode.id,
							toNodeId: targetNode.id,
						},
					);
					const error = {
						message: connectionError.message,
						code: 'OUTPUT_INDEX_NOT_FOUND',
						details: {
							sourceNode: sourceNode.name,
							targetNode: targetNode.name,
							connectionType: validatedInput.connectionType,
							sourceOutputIndex: validatedInput.sourceOutputIndex,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Check if the specific connection exists
				const connectionExists = outputConnections.some(
					(conn) =>
						conn.node === targetNode.name &&
						conn.type === validatedInput.connectionType &&
						conn.index === validatedInput.targetInputIndex,
				);

				if (!connectionExists) {
					const connectionError = new ConnectionError(
						`Connection not found: ${sourceNode.name} → ${targetNode.name} (${validatedInput.connectionType}) at output ${validatedInput.sourceOutputIndex} to input ${validatedInput.targetInputIndex}`,
						{
							fromNodeId: sourceNode.id,
							toNodeId: targetNode.id,
						},
					);
					const error = {
						message: connectionError.message,
						code: 'SPECIFIC_CONNECTION_NOT_FOUND',
						details: {
							sourceNode: sourceNode.name,
							targetNode: targetNode.name,
							connectionType: validatedInput.connectionType,
							sourceOutputIndex: validatedInput.sourceOutputIndex,
							targetInputIndex: validatedInput.targetInputIndex,
							existingConnections: outputConnections.map((conn) => ({
								node: conn.node,
								type: conn.type,
								index: conn.index,
							})),
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Build success message
				const message = buildResponseMessage(
					sourceNode.name,
					targetNode.name,
					validatedInput.connectionType,
					validatedInput.sourceOutputIndex,
					validatedInput.targetInputIndex,
				);

				logger?.debug('Connection found and will be removed');

				// Report completion
				const output: RemoveConnectionOutput = {
					sourceNode: sourceNode.name,
					targetNode: targetNode.name,
					connectionType: validatedInput.connectionType,
					sourceOutputIndex: validatedInput.sourceOutputIndex,
					targetInputIndex: validatedInput.targetInputIndex,
					message,
				};
				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = removeConnectionFromWorkflow(
					sourceNode.name,
					targetNode.name,
					validatedInput.connectionType,
					validatedInput.sourceOutputIndex,
					validatedInput.targetInputIndex,
				);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				let toolError;

				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid connection removal parameters', {
						field: error.errors[0]?.path.join('.'),
						value: error.errors[0]?.message,
					});
					toolError = {
						message: validationError.message,
						code: 'VALIDATION_ERROR',
						details: error.errors,
					};
				} else {
					toolError = {
						message: error instanceof Error ? error.message : 'Unknown error occurred',
						code: 'EXECUTION_ERROR',
					};
				}

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: REMOVE_CONNECTION_TOOL.toolName,
			description: `Remove a specific connection between two nodes in the workflow. This allows you to disconnect nodes without deleting them.

USAGE:
Use this tool when you need to break an existing connection while keeping both nodes in the workflow.

PARAMETERS:
- sourceNodeId: The UUID of the node that is the source of the connection (where the data comes from)
- targetNodeId: The UUID of the node that receives the connection (where the data goes to)
- connectionType: The type of connection to remove (default: "main")
  * For regular data flow: "main"
  * For AI connections: "ai_languageModel", "ai_tool", "ai_memory", "ai_embedding", "ai_document", etc.
- sourceOutputIndex: Which output of the source node to disconnect from (default: 0)
- targetInputIndex: Which input of the target node to disconnect from (default: 0)

EXAMPLES:
1. Remove main data connection:
   sourceNodeId: "abc-123", targetNodeId: "def-456", connectionType: "main"

2. Remove AI model from AI Agent:
   sourceNodeId: "model-id", targetNodeId: "agent-id", connectionType: "ai_languageModel"

3. Remove specific connection when multiple exist:
   sourceNodeId: "node-1", targetNodeId: "node-2", connectionType: "main", sourceOutputIndex: 1, targetInputIndex: 0

NOTES:
- Both nodes must exist in the workflow
- The specific connection must exist or an error will be returned
- Use this when restructuring workflows or replacing connections`,
			schema: removeConnectionSchema,
		},
	);

	return {
		tool: dynamicTool,
		...REMOVE_CONNECTION_TOOL,
	};
}
