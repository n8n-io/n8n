import { tool } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { BuilderTool, BuilderToolBase } from '@/utils/stream-processor';

import {
	ConnectionError,
	NodeNotFoundError,
	NodeTypeNotFoundError,
	ValidationError,
} from '../errors';
import type { SimpleWorkflow } from '../types/workflow';
import { createProgressReporter, reportProgress } from './helpers/progress';
import { createSuccessResponse, createErrorResponse } from './helpers/response';
import { getCurrentWorkflow, getWorkflowState, updateWorkflowConnections } from './helpers/state';
import { validateNodeExists } from './helpers/validation';
import {
	validateConnection,
	formatConnectionMessage,
	inferConnectionType,
} from './utils/connection.utils';
import type { ConnectNodesOutput } from '../types/tools';

/**
 * Schema for node connection
 */
export const nodeConnectionSchema = z.object({
	sourceNodeId: z
		.string()
		.describe(
			'REQUIRED: The node UUID (e.g., "e9f71f78-40c5-4109-b742-11feca4ca0b1"). Do NOT use node names - only UUIDs work. Get the UUID from add_node response or workflow state. For ai_* connections, this is the sub-node (provider). For main connections, this is the output producer.',
		),
	targetNodeId: z
		.string()
		.describe(
			'REQUIRED: The node UUID (e.g., "2fdeeba2-9d10-43b6-bb8c-7005bc6b05b8"). Do NOT use node names - only UUIDs work. Get the UUID from add_node response or workflow state. For ai_* connections, this is the main node (consumer). For main connections, this is the input receiver.',
		),
	sourceOutputIndex: z
		.number()
		.optional()
		.describe('The index of the output to connect from (default: 0)'),
	targetInputIndex: z
		.number()
		.optional()
		.describe('The index of the input to connect to (default: 0)'),
});

export const CONNECT_NODES_TOOL: BuilderToolBase = {
	toolName: 'connect_nodes',
	displayTitle: 'Connecting nodes',
};

/**
 * Factory function to create the connect nodes tool
 */
export function createConnectNodesTool(
	nodeTypes: INodeTypeDescription[],
	logger?: Logger,
): BuilderTool {
	const dynamicTool = tool(
		// eslint-disable-next-line complexity
		(input, config) => {
			const reporter = createProgressReporter(
				config,
				CONNECT_NODES_TOOL.toolName,
				CONNECT_NODES_TOOL.displayTitle,
			);

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
				let matchedSourceNode = validateNodeExists(validatedInput.sourceNodeId, workflow.nodes);
				let matchedTargetNode = validateNodeExists(validatedInput.targetNodeId, workflow.nodes);

				// Check if both nodes exist
				if (!matchedSourceNode || !matchedTargetNode) {
					const missingNodeId = !matchedSourceNode
						? validatedInput.sourceNodeId
						: validatedInput.targetNodeId;

					// Check if the ID looks like a UUID (helps detect when names are used instead)
					const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
					const isLikelyNodeName = !uuidPattern.test(missingNodeId);

					const nodeError = new NodeNotFoundError(missingNodeId);
					const errorMessage = isLikelyNodeName
						? `${nodeError.message}. HINT: "${missingNodeId}" looks like a node name, not a UUID. You must use the node's UUID (e.g., "e9f71f78-40c5-4109-b742-11feca4ca0b1") from the add_node response.`
						: nodeError.message;

					const error = {
						message: errorMessage,
						code: 'NODES_NOT_FOUND',
						details: {
							sourceNodeId: validatedInput.sourceNodeId,
							targetNodeId: validatedInput.targetNodeId,
							foundSource: !!matchedSourceNode,
							foundTarget: !!matchedTargetNode,
							hint: isLikelyNodeName
								? 'Use node UUIDs, not node names'
								: 'Node may not exist yet - ensure add_node was called first',
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Find node type descriptions
				const sourceNodeType = nodeTypes.find((nt) => nt.name === matchedSourceNode!.type);
				const targetNodeType = nodeTypes.find((nt) => nt.name === matchedTargetNode!.type);

				if (!sourceNodeType || !targetNodeType) {
					const missingType = !sourceNodeType ? matchedSourceNode.type : matchedTargetNode.type;
					const typeError = new NodeTypeNotFoundError(missingType);
					const error = {
						message: typeError.message,
						code: 'NODE_TYPE_NOT_FOUND',
						details: {
							sourceType: matchedSourceNode.type,
							targetType: matchedTargetNode.type,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Determine connection type
				reportProgress(reporter, 'Inferring connection type...');

				logger?.debug('\n=== Connect Nodes Tool ===');
				logger?.debug(
					`Attempting to connect: ${matchedSourceNode.name} -> ${matchedTargetNode.name}`,
				);

				const inferResult = inferConnectionType(
					matchedSourceNode,
					matchedTargetNode,
					sourceNodeType,
					targetNodeType,
				);

				if (inferResult.error) {
					const connectionError = new ConnectionError(inferResult.error, {
						fromNodeId: matchedSourceNode.id,
						toNodeId: matchedTargetNode.id,
					});
					const error = {
						message: connectionError.message,
						code: 'CONNECTION_TYPE_INFERENCE_ERROR',
						details: {
							sourceNode: matchedSourceNode.name,
							targetNode: matchedTargetNode.name,
							possibleTypes: inferResult.possibleTypes,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				if (!inferResult.connectionType) {
					const error = {
						message: 'Could not infer connection type',
						code: 'CONNECTION_TYPE_INFERENCE_FAILED',
						details: {
							sourceNode: matchedSourceNode.name,
							targetNode: matchedTargetNode.name,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				const connectionType = inferResult.connectionType;
				const inferredSwap = inferResult.requiresSwap ?? false;

				// If swap is required from inference, swap the nodes
				if (inferredSwap) {
					logger?.debug('Swapping nodes based on inference result');
					const temp = matchedSourceNode;
					matchedSourceNode = matchedTargetNode;
					matchedTargetNode = temp;
				}

				reportProgress(
					reporter,
					`Inferred connection type: ${connectionType}${inferredSwap ? ' (swapped nodes)' : ''}`,
				);
				logger?.debug(
					`Final connection: ${matchedSourceNode.name} -> ${matchedTargetNode.name} (${connectionType})\n`,
				);

				// Report progress
				reportProgress(
					reporter,
					`Connecting ${matchedSourceNode.name} to ${matchedTargetNode.name}...`,
				);

				// Validate connection and check if nodes need to be swapped
				const validation = validateConnection(
					matchedSourceNode,
					matchedTargetNode,
					connectionType,
					nodeTypes,
				);

				if (!validation.valid) {
					const connectionError = new ConnectionError(validation.error ?? 'Invalid connection', {
						fromNodeId: matchedSourceNode.id,
						toNodeId: matchedTargetNode.id,
					});
					const error = {
						message: connectionError.message,
						code: 'INVALID_CONNECTION',
						details: {
							sourceNode: matchedSourceNode.name,
							targetNode: matchedTargetNode.name,
							connectionType,
						},
					};
					reporter.error(error);
					return createErrorResponse(config, error);
				}

				// Use potentially swapped nodes
				const actualSourceNode = validation.swappedSource ?? matchedSourceNode;
				const actualTargetNode = validation.swappedTarget ?? matchedTargetNode;
				// Track if nodes were swapped either during inference or validation
				const swapped = inferredSwap || !!validation.shouldSwap;

				// Create only the new connection (not the full connections object)
				// This is important for parallel execution - each tool only returns its own connection
				const sourceIndex = validatedInput.sourceOutputIndex ?? 0;
				const targetIndex = validatedInput.targetInputIndex ?? 0;

				const newConnection: SimpleWorkflow['connections'] = {
					[actualSourceNode.name]: {
						[connectionType]: Array(sourceIndex + 1)
							.fill(null)
							.map((_, i) =>
								i === sourceIndex
									? [
											{
												node: actualTargetNode.name,
												type: connectionType,
												index: targetIndex,
											},
										]
									: [],
							),
					},
				};

				// Build success message
				const message = formatConnectionMessage(
					actualSourceNode.name,
					actualTargetNode.name,
					connectionType,
					swapped,
				);

				// Report completion
				const output: ConnectNodesOutput = {
					sourceNode: actualSourceNode.name,
					targetNode: actualTargetNode.name,
					connectionType,
					swapped,
					message,
					found: {
						sourceNode: true,
						targetNode: true,
					},
				};

				reporter.complete(output);

				// Return success with state updates
				const stateUpdates = updateWorkflowConnections(newConnection);
				return createSuccessResponse(config, message, stateUpdates);
			} catch (error) {
				// Handle validation or unexpected errors
				let toolError;

				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid connection parameters', {
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
			name: CONNECT_NODES_TOOL.toolName,
			description: `Connect two nodes in the workflow. The tool automatically determines the connection type based on node capabilities and ensures correct connection direction.

UNDERSTANDING CONNECTIONS:
- SOURCE NODE: The node that PRODUCES output/provides capability
- TARGET NODE: The node that RECEIVES input/uses capability
- Flow direction: Source → Target

AUTOMATIC CONNECTION TYPE DETECTION:
- The tool analyzes the nodes' inputs and outputs to determine the appropriate connection type
- If multiple connection types are possible, the tool will provide an error with the available options
- The connection type is determined by matching compatible input/output types between nodes

For ai_* connections (ai_languageModel, ai_tool, ai_memory, ai_embedding, etc.):
- Sub-nodes are ALWAYS the source (they provide capabilities)
- Main nodes are ALWAYS the target (they use capabilities)
- The tool will AUTO-CORRECT if you specify them backwards

CONNECTION EXAMPLES:
- OpenAI Chat Model → AI Agent (detects ai_languageModel)
- Calculator Tool → AI Agent (detects ai_tool)
- Simple Memory → Basic LLM Chain (detects ai_memory)
- Embeddings OpenAI → Vector Store (detects ai_embedding)
- Document Loader → Embeddings OpenAI (detects ai_document)
- HTTP Request → Set (detects main)`,
			schema: nodeConnectionSchema,
		},
	);

	return {
		tool: dynamicTool,
		...CONNECT_NODES_TOOL,
	};
}
