import type { ToolCallState } from '../constants';
import { TOOL_CALL_STATE } from '../constants';
import type { ToolCall } from '../composables/agentChatMessages';
import { isDelegateSubAgentTool, parseDelegateOutput } from './delegate-tool';
import {
	formatWriteTodosMarkdown,
	isWriteTodosTool,
	type WriteTodosI18n,
} from './write-todos-tool';

function isSettledState(state: ToolCallState): boolean {
	return state === TOOL_CALL_STATE.DONE || state === TOOL_CALL_STATE.ERROR;
}

function formatGenericToolOutput(output: unknown): string | undefined {
	if (output === undefined || output === null) return undefined;

	if (typeof output === 'string') {
		const trimmed = output.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	if (Array.isArray(output) && output.length === 0) return undefined;

	if (typeof output === 'object' && !Array.isArray(output) && Object.keys(output).length === 0) {
		return undefined;
	}

	try {
		return `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``;
	} catch {
		const asString = String(output).trim();
		return asString.length > 0 ? asString : undefined;
	}
}

function formatDelegateDetails(output: unknown): string | undefined {
	const parsed = parseDelegateOutput(output);
	if (!parsed) return formatGenericToolOutput(output);

	const answer = parsed.answer?.trim();
	if (answer) return answer;

	const error = parsed.error?.trim();
	if (error) return error;

	return undefined;
}

function formatSpecializedDetails(
	toolName: string,
	output: unknown,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (isDelegateSubAgentTool(toolName)) {
		return formatDelegateDetails(output);
	}

	if (isWriteTodosTool(toolName)) {
		if (!i18n) return undefined;
		return formatWriteTodosMarkdown(output, i18n, subAgentNameById);
	}

	return formatGenericToolOutput(output);
}

/**
 * Returns Markdown/text for the expandable tool-call details panel.
 * Only settled tool calls with non-empty output/error content are expandable.
 */
export function getToolCallDetails(
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (!isSettledState(tc.state)) return undefined;
	return formatSpecializedDetails(tc.tool, tc.output, i18n, subAgentNameById);
}

export function isToolCallExpandable(
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): boolean {
	return getToolCallDetails(tc, i18n, subAgentNameById) !== undefined;
}
