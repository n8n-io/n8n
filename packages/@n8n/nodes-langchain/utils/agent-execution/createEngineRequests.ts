import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineRequest, IDataObject } from 'n8n-workflow';

import type { RequestResponseMetadata, ToolCallRequest } from './types';

/**
 * Creates engine requests from tool calls.
 * Maps tool call information to the format expected by the n8n engine
 * for executing tool nodes.
 *
 * This is a generalized version that can be used across different agent types
 * (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * @param toolCalls - Array of tool call requests to convert
 * @param itemIndex - The current item index
 * @param tools - Array of available tools
 * @returns Array of engine request objects (filtered to remove undefined entries)
 */
export async function createEngineRequests(
	toolCalls: ToolCallRequest[],
	itemIndex: number,
	tools: Array<DynamicStructuredTool | Tool>,
): Promise<EngineRequest<RequestResponseMetadata>['actions']> {
	return toolCalls
		.map((toolCall) => {
			// First try to get from metadata (for toolkit tools)
			const foundTool = tools.find((tool) => tool.name === toolCall.tool);

			if (!foundTool) return undefined;

			const nodeName = foundTool.metadata?.sourceNodeName as string | undefined;

			// Ensure nodeName is defined
			if (!nodeName) return undefined;

			// For toolkit tools, include the tool name so the node knows which tool to execute
			const input = foundTool.metadata?.isFromToolkit
				? { ...toolCall.toolInput, tool: toolCall.tool }
				: toolCall.toolInput;

			// Extract thought_signature from the AIMessage in messageLog (for Gemini 3)
			let thoughtSignature: string | undefined;
			if (toolCall.messageLog && Array.isArray(toolCall.messageLog)) {
				for (const message of toolCall.messageLog) {
					// Check if message has content that could contain thought_signature
					if (message && typeof message === 'object' && 'content' in message) {
						const content = message.content;
						// Content can be string or array of content blocks
						if (Array.isArray(content)) {
							// Look for thought_signature in content blocks
							for (const block of content) {
								if (block && typeof block === 'object' && 'thoughtSignature' in block) {
									thoughtSignature = block.thoughtSignature as string;
									break;
								}
							}
						}
						if (thoughtSignature) break;
					}
				}
			}

			return {
				actionType: 'ExecutionNodeAction' as const,
				nodeName,
				input: input as IDataObject,
				type: NodeConnectionTypes.AiTool,
				id: toolCall.toolCallId,
				metadata: {
					itemIndex,
					...(thoughtSignature && { thoughtSignature }),
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}
