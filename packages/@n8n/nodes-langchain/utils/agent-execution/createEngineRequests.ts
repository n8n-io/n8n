import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineRequest, IDataObject } from 'n8n-workflow';

import { isThinkingBlock, isRedactedThinkingBlock, isGeminiThoughtSignatureBlock } from './types';
import type {
	RequestResponseMetadata,
	ToolCallRequest,
	ToolMetadata,
	ThinkingMetadata,
	HitlMetadata,
} from './types';

function hasGatedToolNodeName(
	metadata: ToolMetadata,
): metadata is ToolMetadata & { gatedToolNodeName: string } {
	return typeof metadata.gatedToolNodeName === 'string';
}

function extractHitlMetadata(
	metadata: ToolMetadata,
	toolName: string,
	toolInput: IDataObject,
): HitlMetadata | undefined {
	if (!hasGatedToolNodeName(metadata)) return undefined;

	return {
		gatedToolNodeName: metadata.gatedToolNodeName,
		toolName,
		originalInput: toolInput.toolParameters as IDataObject,
	};
}

function extractThinkingMetadata(messageLog: unknown[] | undefined): ThinkingMetadata {
	const result: ThinkingMetadata = {};
	if (!messageLog || !Array.isArray(messageLog)) return result;

	for (const message of messageLog) {
		if (!message || typeof message !== 'object' || !('content' in message)) continue;

		const content = (message as { content: unknown }).content;
		if (!Array.isArray(content)) continue;

		for (const block of content) {
			if (isGeminiThoughtSignatureBlock(block)) {
				result.google = { thoughtSignature: block.thoughtSignature };
			}

			if (isThinkingBlock(block)) {
				result.anthropic = {
					thinkingContent: block.thinking,
					thinkingType: 'thinking',
					thinkingSignature: block.signature,
				};
			} else if (isRedactedThinkingBlock(block)) {
				result.anthropic = {
					thinkingContent: block.data,
					thinkingType: 'redacted_thinking',
				};
			}
		}

		if (result.google || result.anthropic) break;
	}

	return result;
}

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

			if (typeof nodeName !== 'string') return undefined;

			const metadata = (foundTool.metadata ?? {}) as ToolMetadata;
			const toolInput = toolCall.toolInput as IDataObject;
			const hitlMetadata = extractHitlMetadata(metadata, toolCall.tool, toolInput);

			let input: IDataObject = toolInput;
			if (metadata.isFromToolkit) {
				input = { ...input, tool: toolCall.tool };
			}
			if (hitlMetadata) {
				// This input will be used as HITL node input
				input = { ...input, ...(input.hitlParameters as IDataObject) };
			}

			return {
				actionType: 'ExecutionNodeAction' as const,
				nodeName,
				input,
				type: NodeConnectionTypes.AiTool,
				id: toolCall.toolCallId,
				metadata: {
					itemIndex,
					hitl: hitlMetadata,
					...extractThinkingMetadata(toolCall.messageLog),
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}
