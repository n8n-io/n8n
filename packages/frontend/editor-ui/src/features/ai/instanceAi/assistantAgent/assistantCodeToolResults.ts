import { unwrapToolCatalogCall } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent } from 'vue';

import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { MAX_TOOL_DATA_DISPLAY_LENGTH } from '@/features/ai/shared/components/ToolDataBlock/toolData.utils';

import { extractToolCallCode } from '../toolResultCode';

/**
 * The code in the output of an Assistant code tool call, or `undefined` for
 * another call, an output without code, or code too long to highlight. The
 * default output block shortens long values, so it shows those.
 */
export function getAssistantToolCallCode(toolCall: ToolCall): string | undefined {
	// A tool catalog `call_tool` call runs another tool, so read the tool that it runs.
	const { toolName, args } = unwrapToolCatalogCall(
		toolCall.tool,
		isRecord(toolCall.input) ? toolCall.input : {},
	);
	const code = extractToolCallCode(toolName, args, toolCall.output);
	return code && code.length <= MAX_TOOL_DATA_DISPLAY_LENGTH ? code : undefined;
}

/** Shows the workflow code and node type definitions of the Assistant tools as highlighted code. */
export const assistantCodeToolResultExtension: AgentsChatInteractionExtension = {
	key: 'assistant_tool_result_code',
	matchToolOutput: (toolCall) => getAssistantToolCallCode(toolCall) !== undefined,
	toolOutputComponent: defineAsyncComponent(
		async () => await import('./AssistantToolResultCode.vue'),
	),
};
