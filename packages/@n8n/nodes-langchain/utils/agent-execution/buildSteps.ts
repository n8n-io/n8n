import { AIMessage } from '@langchain/core/messages';
import { nodeNameToToolName } from 'n8n-workflow';
import type { EngineResponse, IDataObject } from 'n8n-workflow';

import type { RequestResponseMetadata, ToolCallData } from './types';

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
			// Create a synthetic AI message for the messageLog
			// This represents the AI's decision to call the tool
			// Extract thought_signature from metadata if present (for Gemini 3)
			const rawThoughtSignature = tool.action.metadata?.thoughtSignature;
			const thoughtSignature =
				typeof rawThoughtSignature === 'string' ? rawThoughtSignature : undefined;

			// Build the tool call object with thought_signature if present
			// The thought_signature must be part of the tool call itself for Gemini 3
			const toolCall = {
				id: typeof toolInput?.id === 'string' ? toolInput.id : 'reconstructed_call',
				name: nodeNameToToolName(tool.action.nodeName),
				args: toolInput,
				type: 'tool_call' as const,
				additional_kwargs: {
					...(thoughtSignature && { thought_signature: thoughtSignature }),
				},
			};

			const syntheticAIMessage = new AIMessage({
				content: `Calling ${tool.action.nodeName} with input: ${JSON.stringify(toolInput)}`,
				tool_calls: [toolCall],
			});

			const toolResult = {
				action: {
					tool: nodeNameToToolName(tool.action.nodeName),
					toolInput: (toolInput.input as IDataObject) || {},
					log: toolInput.log || syntheticAIMessage.content,
					messageLog: [syntheticAIMessage],
					toolCallId: toolInput?.id,
					type: toolInput.type || 'tool_call',
				},
				observation: JSON.stringify(tool.data?.data?.ai_tool?.[0]?.map((item) => item?.json) ?? ''),
			};

			steps.push(toolResult);
		}
	}
	return steps;
}
