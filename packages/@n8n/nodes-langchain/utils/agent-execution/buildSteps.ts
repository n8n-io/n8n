import type { MessageContent } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';
import { nodeNameToToolName } from 'n8n-workflow';
import type { EngineResponse, IDataObject } from 'n8n-workflow';

import type { RequestResponseMetadata, ToolCallData } from './types';

/**
 * Checks if the content is a LangChain standard content block array
 * (used for multimodal responses like images, audio, etc.)
 */
function isContentBlockArray(content: unknown): boolean {
	if (!Array.isArray(content)) return false;
	return content.some(
		(item) =>
			typeof item === 'object' &&
			item !== null &&
			'type' in item &&
			'source_type' in item &&
			['base64', 'url', 'text', 'id'].includes(item.source_type as string),
	);
}

/**
 * Formats tool observation for agent steps.
 * Preserves content block arrays for multimodal responses (images, audio, etc.)
 * while stringifying other response types for backwards compatibility.
 */
function formatObservation(toolResponses: unknown[]): MessageContent {
	// If there's a single response that's a string, return it directly
	if (toolResponses.length === 1) {
		const response = toolResponses[0];
		if (typeof response === 'string') {
			return response;
		}
		// Check if it's a content block array (e.g., from MCP tools with images)
		if (isContentBlockArray(response)) {
			return response as MessageContent;
		}
		// Check if the response has a 'response' property that contains content blocks
		if (
			typeof response === 'object' &&
			response !== null &&
			'response' in response &&
			isContentBlockArray((response as { response: unknown }).response)
		) {
			return (response as { response: MessageContent }).response;
		}
	}
	// For multiple responses or non-content-block responses, stringify
	return JSON.stringify(toolResponses.length === 1 ? toolResponses[0] : toolResponses);
}

/**
 * Rebuilds the agent steps from previous tool call responses.
 * This is used to continue agent execution after tool calls have been made.
 *
 * This is a generalized version that can be used across different agent types
 * (Tools Agent, OpenAI Functions Agent, etc.).
 *
 * @param response - The engine response containing tool call results
 * @param itemIndex - The current item index being processed
 * @returns Array of tool call data representing the agent steps
 */
export function buildSteps(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): ToolCallData[] {
	const steps: ToolCallData[] = [];

	if (response) {
		const responses = response?.actionResponses ?? [];

		if (response.metadata?.previousRequests) {
			steps.push.apply(steps, response.metadata.previousRequests);
		}

		for (const tool of responses) {
			if (tool.action?.metadata?.itemIndex !== itemIndex) continue;

			const toolInput: IDataObject = {
				...tool.action.input,
				id: tool.action.id,
			};
			if (!toolInput || !tool.data) {
				continue;
			}

			const step = steps.find((step) => step.action.toolCallId === toolInput.id);
			if (step) {
				continue;
			}

			// For toolkit tools (like MCP Client), the actual tool name is stored in the input
			// Use it instead of converting the node name to maintain consistency with what the model sees
			const actualToolName =
				typeof toolInput.tool === 'string'
					? toolInput.tool
					: nodeNameToToolName(tool.action.nodeName);

			// Create a synthetic AI message for the messageLog
			// This represents the AI's decision to call the tool
			const syntheticAIMessage = new AIMessage({
				content: `Calling ${actualToolName} with input: ${JSON.stringify(toolInput)}`,
				tool_calls: [
					{
						id: (toolInput?.id as string) ?? 'reconstructed_call',
						name: actualToolName,
						args: toolInput,
						type: 'tool_call',
					},
				],
			});

			const toolResponses = tool.data?.data?.ai_tool?.[0]?.map((item) => item?.json) ?? [];

			const toolResult = {
				action: {
					tool: actualToolName,
					toolInput: (toolInput.input as IDataObject) || {},
					log: toolInput.log || syntheticAIMessage.content,
					messageLog: [syntheticAIMessage],
					toolCallId: toolInput?.id,
					type: toolInput.type || 'tool_call',
				},
				observation: formatObservation(toolResponses),
			};

			steps.push(toolResult);
		}
	}

	return steps;
}
