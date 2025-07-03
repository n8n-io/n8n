import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command, getCurrentTaskInput, type LangGraphRunnableConfig } from '@langchain/langgraph';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { WorkflowState } from '../workflow-state';
import { isSubNode } from '../utils/node-helpers';

export interface NodeDetails {
	name: string;
	displayName: string;
	description: string;
	properties: any[];
	subtitle?: string;
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
}

const nodesConnectionsSchema = z.object({
	sourceNodeId: z
		.string()
		.describe(
			'The ID of the source node. For ai_* connections (ai_languageModel, ai_tool, etc.), this MUST be the sub-node (e.g., OpenAI Chat Model). For main connections, this is the node producing the output',
		),
	targetNodeId: z
		.string()
		.describe(
			'The ID of the target node. For ai_* connections, this MUST be the main node that accepts the sub-node (e.g., AI Agent, Basic LLM Chain). For main connections, this is the node receiving the input',
		),
	connectionType: z
		.nativeEnum(NodeConnectionTypes)
		.describe(
			'The type of connection: "main" for regular data flow, or sub-node types like "ai_languageModel" (for LLM models), "ai_tool" (for agent tools), "ai_memory" (for chat memory) etc.',
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

export const createConnectNodesTool = (nodeTypes: INodeTypeDescription[]) => {
	return tool(
		async (input, config: LangGraphRunnableConfig) => {
			const currentState = getCurrentTaskInput() as typeof WorkflowState.State;
			const workflowJSON = currentState.workflowJSON;

			// Emit tool start with input
			config.writer?.({
				type: 'tool',
				toolName: 'connect_nodes',
				// @ts-ignore
				toolCallId: config.toolCall?.id,
				status: 'running',
				updates: [
					{
						type: 'input',
						data: input,
					},
				],
			});

			// Emit progress update
			config.writer?.({
				type: 'tool',
				toolName: 'connect_nodes',
				// @ts-ignore
				toolCallId: config.toolCall?.id,
				status: 'running',
				updates: [
					{
						type: 'progress',
						data: `Finding nodes to connect...`,
					},
				],
			});

			const matchedSourceNode = workflowJSON?.nodes.find((node) => node.id === input.sourceNodeId);
			const matchedTargetNode = workflowJSON?.nodes.find((node) => node.id === input.targetNodeId);

			if (!matchedSourceNode || !matchedTargetNode) {
				console.log('No matched source node or target node');

				// Emit error completion
				config.writer?.({
					type: 'tool',
					toolName: 'connect_nodes',
					// @ts-ignore
					toolCallId: config.toolCall?.id,
					status: 'error',
					updates: [
						{
							type: 'error',
							data: {
								message: `Source node "${input.sourceNodeId}" or target node "${input.targetNodeId}" not found`,
								sourceNodeId: input.sourceNodeId,
								targetNodeId: input.targetNodeId,
							},
						},
					],
				});

				return new Command({
					update: {
						messages: [
							new ToolMessage({
								content: `Source node "${input.sourceNodeId}" or target node "${input.targetNodeId}" not found. Please check the node names and try again.`,
								// @ts-ignore
								tool_call_id: config.toolCall?.id,
							}),
						],
					},
				});
			}

			console.log('Matched source node:', matchedSourceNode.name);
			console.log('Matched target node:', matchedTargetNode.name);

			// Emit progress update
			config.writer?.({
				type: 'tool',
				toolName: 'connect_nodes',
				// @ts-ignore
				toolCallId: config.toolCall?.id,
				status: 'running',
				updates: [
					{
						type: 'progress',
						data: `Connecting ${matchedSourceNode.name} to ${matchedTargetNode.name}...`,
					},
				],
			});

			const sourceNodeType = nodeTypes.find((nt) => nt.name === matchedSourceNode.type);
			const targetNodeType = nodeTypes.find((nt) => nt.name === matchedTargetNode.type);
			const sourceNodeTypeIsSubNode = sourceNodeType ? isSubNode(sourceNodeType) : false;
			const targetNodeTypeIsSubNode = targetNodeType ? isSubNode(targetNodeType) : false;

			console.log('Source node type is sub-node:', sourceNodeTypeIsSubNode, sourceNodeType?.name);
			console.log('Target node type is sub-node:', targetNodeTypeIsSubNode, targetNodeType?.name);
			// Auto-swap nodes if they're in the wrong order for ai_* connections
			let actualSourceNode = matchedSourceNode;
			let actualTargetNode = matchedTargetNode;
			let swapped = false;

			if (input.connectionType.startsWith('ai_')) {
				// If target is a sub-node, swap them
				if (targetNodeTypeIsSubNode && !sourceNodeTypeIsSubNode) {
					actualSourceNode = matchedTargetNode;
					actualTargetNode = matchedSourceNode;
					swapped = true;
					console.log(
						`Auto-swapping nodes: ${actualSourceNode.name} (sub-node) will be source, ${actualTargetNode.name} will be target`,
					);
				}
				// If source is not a sub-node but target might be, check if we should swap
				else if (!sourceNodeTypeIsSubNode && !targetNodeTypeIsSubNode) {
					// Both are main nodes - this is an error case we can't auto-fix
					// Emit error completion
					config.writer?.({
						type: 'tool',
						toolName: 'connect_nodes',
						status: 'error',
						updates: [
							{
								type: 'error',
								data: {
									message: `Connection type "${input.connectionType}" requires a sub-node, but both nodes are main nodes`,
									connectionType: input.connectionType,
									sourceNode: actualSourceNode.name,
									targetNode: actualTargetNode.name,
								},
							},
						],
					});

					return new Command({
						update: {
							messages: [
								new ToolMessage({
									content: `Error: Connection type "${input.connectionType}" requires a sub-node, but both nodes are main nodes. Please add an appropriate sub-node first (e.g., OpenAI Chat Model for ai_languageModel).`,
									// @ts-ignore
									tool_call_id: config.toolCall?.id,
								}),
							],
						},
					});
				}
			}

			// Create new connection using the potentially swapped nodes
			const connection = workflowJSON.connections[actualSourceNode.name] ?? {};
			if (!connection[input.connectionType]) {
				connection[input.connectionType] = [];
			}
			let connectionType = connection[input.connectionType];
			connectionType[input.sourceOutputIndex ?? 0] ??= [];
			connectionType[input.sourceOutputIndex ?? 0]?.push({
				index: input.targetInputIndex ?? 0,
				node: actualTargetNode.name,
				type: input.connectionType,
			});
			connectionType = connectionType.map((i) => {
				if (!i) return [];
				return i;
			});
			console.log('Updated connection:', connection);

			// Update workflowJSON
			workflowJSON.connections[actualSourceNode.name] = connection;

			// Create informative success message
			let successMessage = 'Connected nodes successfully';
			if (swapped) {
				successMessage = `Auto-corrected connection: ${actualSourceNode.name} (${input.connectionType}) → ${actualTargetNode.name}. (Note: Swapped nodes to ensure sub-node is the source)`;
			} else {
				successMessage = `Connected: ${actualSourceNode.name} → ${actualTargetNode.name} (${input.connectionType})`;
			}

			// Emit success completion
			config.writer?.({
				type: 'tool',
				toolName: 'connect_nodes',
				// @ts-ignore
				toolCallId: config.toolCall?.id,
				status: 'completed',
				updates: [
					{
						type: 'output',
						data: {
							sourceNode: actualSourceNode.name,
							targetNode: actualTargetNode.name,
							connectionType: input.connectionType,
							swapped,
							message: successMessage,
						},
					},
				],
			});

			return new Command({
				update: {
					messages: [
						new ToolMessage({
							content: successMessage,
							// @ts-ignore
							tool_call_id: config.toolCall?.id,
						}),
					],
					workflowJSON,
				},
			});
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
			schema: nodesConnectionsSchema,
		},
	);
};
