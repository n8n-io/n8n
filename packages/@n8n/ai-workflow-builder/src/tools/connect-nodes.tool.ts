import type { INodeTypeDescription } from 'n8n-workflow';

import type { ToolContext, ToolResult, z } from './base';
import { BaseWorkflowBuilderTool } from './base';
import type { WorkflowState } from '../workflow-state';
import { nodeConnectionSchema, type ConnectionResult } from './types/node.types';
import {
	validateConnection,
	createConnection,
	formatConnectionMessage,
} from './utils/connection.utils';

/**
 * Inferred type from schema
 */
type ConnectNodesInput = z.infer<typeof nodeConnectionSchema>;

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
 * Connect nodes tool implementation using the base infrastructure
 */
export class ConnectNodesTool extends BaseWorkflowBuilderTool<
	typeof nodeConnectionSchema,
	ConnectNodesOutput
> {
	protected readonly schema = nodeConnectionSchema;
	protected readonly name = 'connect_nodes' as const;
	protected readonly description = `Connect two nodes in the workflow. The tool will automatically ensure correct connection direction.

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

Note: If you specify nodes in the wrong order for ai_* connections, they will be automatically swapped to ensure correctness.`;

	/**
	 * Execute the connect nodes tool
	 */
	protected async execute(
		input: ConnectNodesInput,
		context: ToolContext,
	): Promise<ToolResult<ConnectNodesOutput>> {
		const state = context.getCurrentTaskInput() as typeof WorkflowState.State;
		const workflowJSON = state.workflowJSON;

		// Report progress
		context.reporter.progress('Finding nodes to connect...');

		// Find source and target nodes
		const matchedSourceNode = workflowJSON?.nodes.find((node) => node.id === input.sourceNodeId);
		const matchedTargetNode = workflowJSON?.nodes.find((node) => node.id === input.targetNodeId);

		// Check if both nodes exist
		if (!matchedSourceNode || !matchedTargetNode) {
			return {
				success: false,
				error: {
					message: `Source node "${input.sourceNodeId}" or target node "${input.targetNodeId}" not found`,
					code: 'NODES_NOT_FOUND',
					details: {
						sourceNodeId: input.sourceNodeId,
						targetNodeId: input.targetNodeId,
						foundSource: !!matchedSourceNode,
						foundTarget: !!matchedTargetNode,
					},
				},
			};
		}

		// Report progress
		context.reporter.progress(
			`Connecting ${matchedSourceNode.name} to ${matchedTargetNode.name}...`,
		);

		// Validate connection and check if nodes need to be swapped
		const validation = validateConnection(
			matchedSourceNode,
			matchedTargetNode,
			input.connectionType,
			context.nodeTypes,
		);

		if (!validation.valid) {
			return {
				success: false,
				error: {
					message: validation.error ?? 'Invalid connection',
					code: 'INVALID_CONNECTION',
					details: {
						sourceNode: matchedSourceNode.name,
						targetNode: matchedTargetNode.name,
						connectionType: input.connectionType,
					},
				},
			};
		}

		// Use potentially swapped nodes
		const actualSourceNode = validation.swappedSource ?? matchedSourceNode;
		const actualTargetNode = validation.swappedTarget ?? matchedTargetNode;
		const swapped = !!validation.shouldSwap;

		// Create the connection
		const updatedConnections = createConnection(
			{ ...workflowJSON.connections },
			actualSourceNode.name,
			actualTargetNode.name,
			input.connectionType,
			input.sourceOutputIndex,
			input.targetInputIndex,
		);

		// Build success message
		const message = formatConnectionMessage(
			actualSourceNode.name,
			actualTargetNode.name,
			input.connectionType,
			swapped,
		);

		// Return success with state updates
		return {
			success: true,
			data: {
				sourceNode: actualSourceNode.name,
				targetNode: actualTargetNode.name,
				connectionType: input.connectionType,
				swapped,
				message,
				found: {
					sourceNode: true,
					targetNode: true,
				},
			},
			stateUpdates: {
				workflowJSON: {
					...workflowJSON,
					connections: updatedConnections,
				},
			},
		};
	}

	/**
	 * Override to provide custom success message
	 */
	protected formatSuccessMessage(output: ConnectNodesOutput): string {
		return output.message;
	}
}

/**
 * Factory function to create the connect nodes tool
 * Maintains backward compatibility with existing code
 */
export function createConnectNodesTool(nodeTypes: INodeTypeDescription[]) {
	const tool = new ConnectNodesTool(nodeTypes);
	return tool.createLangChainTool();
}
