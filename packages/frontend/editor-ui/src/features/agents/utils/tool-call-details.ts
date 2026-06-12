import type { ToolCallState } from '../constants';
import { TOOL_CALL_STATE } from '../constants';
import type { ToolCall } from '../composables/agentChatMessages';
import { formatDelegateError, isDelegateSubAgentTool, parseDelegateOutput } from './delegate-tool';
import {
	formatWriteTodosMarkdown,
	isWriteTodosTool,
	type WriteTodosI18n,
} from './write-todos-tool';

function isSettledState(state: ToolCallState): boolean {
	return state === TOOL_CALL_STATE.DONE || state === TOOL_CALL_STATE.ERROR;
}

function formatDelegateDetails(output: unknown, i18n?: WriteTodosI18n): string | undefined {
	const parsed = parseDelegateOutput(output);
	if (!parsed) return undefined;

	const answer = parsed.answer?.trim();
	if (answer) return answer;

	const error = parsed.error?.trim();
	if (error) return formatDelegateError(error, i18n);

	return undefined;
}

function formatExpandableDetails(
	toolName: string,
	output: unknown,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (isDelegateSubAgentTool(toolName)) {
		return formatDelegateDetails(output, i18n);
	}

	if (isWriteTodosTool(toolName)) {
		return formatWriteTodosMarkdown(output, i18n, subAgentNameById);
	}

	return undefined;
}

/**
 * Returns Markdown/text for the expandable tool-call details panel.
 * Only `delegate_subagent` and `write_todos` have purpose-built detail views;
 * other tools are not expandable until their UX is designed.
 */
export function getToolCallDetails(
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (!isSettledState(tc.state)) return undefined;
	return formatExpandableDetails(tc.tool, tc.output, i18n, subAgentNameById);
}

export function isToolCallExpandable(
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): boolean {
	return getToolCallDetails(tc, i18n, subAgentNameById) !== undefined;
}
