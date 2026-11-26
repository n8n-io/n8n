import { unwrapToolCatalogCall } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent } from 'vue';

import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import {
	extractTableRows,
	isTableToolCall,
} from '@/features/ai/shared/components/ToolResult/toolResultTable';

/** Whether the call is an Assistant list tool whose output has rows for a table. */
export function isAssistantTableToolCall(toolCall: ToolCall): boolean {
	// A tool catalog `call_tool` call runs another tool, so match the tool that it runs.
	const { toolName, args } = unwrapToolCatalogCall(
		toolCall.tool,
		isRecord(toolCall.input) ? toolCall.input : {},
	);
	return isTableToolCall(toolName, args) && extractTableRows(toolCall.output) !== null;
}

/** Shows the output of the Assistant list tools as a table, inside the default tool step. */
export const assistantToolResultTableExtension: AgentsChatInteractionExtension = {
	key: 'assistant_tool_result_table',
	matchToolOutput: isAssistantTableToolCall,
	toolOutputComponent: defineAsyncComponent(
		async () => await import('./AssistantToolResultTable.vue'),
	),
};
