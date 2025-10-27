import { NodeConnectionTypes } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';

export type ToolCallRequest = {
	tool: string;
	toolInput: Record<string, unknown>;
	toolCallId: string;
	type?: string;
	log?: string;
	messageLog?: unknown[];
};

/**
 * Creates engine requests from tool calls.
 * Maps tool call information to the format expected by the n8n engine
 * for executing tool nodes.
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
) {
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

			return {
				actionType: 'ExecutionNodeAction' as const,
				nodeName: nodeName as string,
				input: input as IDataObject,
				type: NodeConnectionTypes.AiTool,
				id: toolCall.toolCallId,
				metadata: {
					itemIndex,
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== undefined);
}
