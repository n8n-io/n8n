import { tool } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, updateWorkflowConnections } from './helpers/state';
import { validateNodeExists } from './helpers/validation';
import { nodeConnectionSchema, type ConnectionResult } from './types/node.types';
import {
	validateConnection,
	createConnection,
	formatConnectionMessage,
} from './utils/connection.utils';

/**
 * Output type for the connect nodes tool
 */
interface ConnectNodesOutput extends ConnectionResult {
	found: {
		sourceNode: boolean;
		targetNode: boolean;
	};
}

/**
 * Factory function to create the connect nodes tool
 */
export function createConnectNodesTool(nodeTypes: INodeTypeDescription[]) {
	return tool(
		async (input, config) => {
			const reporter = createProgressReporter(config, 'connect_nodes');

			try {
				// Validate input using Zod schema
				const validatedInput = nodeConnectionSchema.parse(input);

				// Report tool start
				reporter.start(validatedInput);

				// Get current state
				const state = getWorkflowState();
				const workflow = getCurrentWorkflow(state);

				// Report progress
				reportProgress(reporter, 'Finding nodes to connect...');

				// Find source and target nodes
				const matchedSourceNode = validateNodeExists(validatedInput.sourceNodeId, workflow.nodes);
				const matchedTargetNode = validateNodeExists(validatedInput.targetNodeId, workflow.nodes);

				// Check if both nodes exist
				if (!matchedSourceNode || !matchedTargetNode) {
					const error = {
						message: `Source node "${validatedInput.sourceNodeId}" or target node "${validatedInput.targetNodeId}" not found`,
						code: 'NODES_NOT_FOUND',
						details: {
							sourceNodeId: validatedInput.sourceNodeId,
							targetNodeId: validatedInput.targetNodeId,
							foundSource: !!matchedSourceNode,
							foundTarget: !!matchedTargetNode,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Report progress
				reportProgress(
					reporter,
					`Connecting ${matchedSourceNode.name} to ${matchedTargetNode.name}...`,
				);

				// Validate connection and check if nodes need to be swapped
				const validation = validateConnection(
					matchedSourceNode,
					matchedTargetNode,
					validatedInput.connectionType,
					nodeTypes,
				);

				if (!validation.valid) {
					const error = {
						message: validation.error ?? 'Invalid connection',
						code: 'INVALID_CONNECTION',
						details: {
							sourceNode: matchedSourceNode.name,
							targetNode: matchedTargetNode.name,
							connectionType: validatedInput.connectionType,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Use potentially swapped nodes
				const actualSourceNode = validation.swappedSource ?? matchedSourceNode;
				const actualTargetNode = validation.swappedTarget ?? matchedTargetNode;
				const swapped = !!validation.shouldSwap;

				// Create the connection
				const updatedConnections = createConnection(
					{ ...workflow.connections },
					actualSourceNode.name,
					actualTargetNode.name,
					validatedInput.connectionType,
					validatedInput.sourceOutputIndex,
					validatedInput.targetInputIndex,
				);

				// Build success message
				const message = formatConnectionMessage(
					actualSourceNode.name,
					actualTargetNode.name,
					validatedInput.connectionType,
					swapped,
				);

				// Report completion
				const output: ConnectNodesOutput = {
					sourceNode: actualSourceNode.name,
					targetNode: actualTargetNode.name,
					connectionType: validatedInput.connectionType,
					swapped,
					message,
					found: {
						sourceNode: true,
						targetNode: true,
					},
				};
				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = updateWorkflowConnections(state, updatedConnections);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				const toolError = {
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
					details: error instanceof z.ZodError ? error.errors : undefined,
				};

				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: 'connect_nodes',
			description: `Connect two nodes in the workflow. The tool will automatically ensure correct connection direction.

UNDERSTANDING CONNECTIONS:
- SOURCE NODE: The node that PRODUCES output/provides capability
- TARGET NODE: The node that RECEIVES input/uses capability
- Flow direction: Source → Target

For ai_* connections (ai_languageModel, ai_tool, ai_memory, ai_embedding, etc.):
- Sub-nodes are ALWAYS the source (they provide capabilities)
- Main nodes are ALWAYS the target (they use capabilities)
- The tool will AUTO-CORRECT if you specify them backwards

CORRECT CONNECTION EXAMPLES:
- OpenAI Chat Model (SOURCE) → AI Agent (TARGET) [ai_languageModel]
- Calculator Tool (SOURCE) → AI Agent (TARGET) [ai_tool]
- Simple Memory (SOURCE) → Basic LLM Chain (TARGET) [ai_memory]
- Embeddings OpenAI (SOURCE) → Vector Store (TARGET) [ai_embedding]
- Document Loader (SOURCE) → Embeddings OpenAI (TARGET) [ai_document]
- HTTP Request (SOURCE) → Set (TARGET) [main]

Note: If you specify nodes in the wrong order for ai_* connections, they will be automatically swapped to ensure correctness.`,
			schema: nodeConnectionSchema,
		},
	);
}
