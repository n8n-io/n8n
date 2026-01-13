import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineRequest, IDataObject } from 'n8n-workflow';

import { isThinkingBlock, isRedactedThinkingBlock, isGeminiThoughtSignatureBlock } from './types';
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

			const nodeName = foundTool.metadata?.sourceNodeName;

			// Ensure nodeName is defined and is a string
			if (typeof nodeName !== 'string') return undefined;

			// For toolkit tools, include the tool name so the node knows which tool to execute
			const input: IDataObject = foundTool.metadata?.isFromToolkit
				? ({ ...toolCall.toolInput, tool: toolCall.tool } as IDataObject)
				: (toolCall.toolInput as IDataObject);

			// Extract thought_signature from the AIMessage in messageLog (for Gemini 3)
			let thoughtSignature: string | undefined;
			// Extract thinking blocks from the AIMessage in messageLog (for Anthropic)
			let thinkingContent: string | undefined;
			let thinkingType: 'thinking' | 'redacted_thinking' | undefined;
			let thinkingSignature: string | undefined;

			if (toolCall.messageLog && Array.isArray(toolCall.messageLog)) {
				for (const message of toolCall.messageLog) {
					// Check if message has content that could contain thought_signature or thinking blocks
					if (message && typeof message === 'object' && 'content' in message) {
						const content = message.content;
						// Content can be string or array of content blocks
						if (Array.isArray(content)) {
							// Look for thought_signature in content blocks (Gemini)
							// and thinking/redacted_thinking blocks (Anthropic)
							for (const block of content) {
								// Gemini thought_signature
								if (isGeminiThoughtSignatureBlock(block)) {
									thoughtSignature = block.thoughtSignature;
								}

								// Anthropic thinking blocks
								if (isThinkingBlock(block)) {
									thinkingContent = block.thinking;
									thinkingType = 'thinking';
									thinkingSignature = block.signature;
								} else if (isRedactedThinkingBlock(block)) {
									thinkingContent = block.data;
									thinkingType = 'redacted_thinking';
								}
							}
						}
						if (thoughtSignature || thinkingContent) break;
					}
				}
			}

			return {
				actionType: 'ExecutionNodeAction' as const,
				nodeName,
				input,
				type: NodeConnectionTypes.AiTool,
				id: toolCall.toolCallId,
				metadata: {
					itemIndex,
					...(thoughtSignature && {
						google: {
							thoughtSignature,
						},
					}),
					...(thinkingContent && {
						anthropic: {
							thinkingContent,
							thinkingType,
							thinkingSignature,
						},
					}),
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}
