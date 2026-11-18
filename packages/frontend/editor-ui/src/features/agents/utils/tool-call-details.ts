import type { ToolCallState } from '../constants';
import { TOOL_CALL_STATE } from '../constants';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import {
	formatDelegateError,
	isDelegateSubAgentTool,
	parseDelegateInput,
	parseDelegateOutput,
} from './delegate-tool';
import {
	formatWriteTodosMarkdown,
	isWriteTodosTool,
	type WriteTodosI18n,
} from './write-todos-tool';

function isSettledState(state: ToolCallState): boolean {
	return state === TOOL_CALL_STATE.DONE || state === TOOL_CALL_STATE.ERROR;
}

function formatDelegateDetails(
	input: unknown,
	output: unknown,
	i18n?: WriteTodosI18n,
): string | undefined {
	const parsed = parseDelegateOutput(output);
	if (!parsed) return undefined;

	const answer = parsed.answer?.trim();
	if (answer) return withDelegateRequest(input, answer, parsed.inputRequired === true, i18n);

	const error = parsed.error?.trim();
	if (error) return formatDelegateError(error, i18n);

	return undefined;
}

/** Shows what the parent agent sent above what the sub-agent answered. */
function withDelegateRequest(
	input: unknown,
	answer: string,
	isQuestion: boolean,
	i18n?: WriteTodosI18n,
): string {
	const request = parseDelegateInput(input);
	const sent = [request?.goal?.trim(), request?.context?.trim()].filter(Boolean).join('\n\n');
	if (!i18n || !sent) return answer;

	const answerLabel = isQuestion
		? i18n.baseText('agents.chat.delegate.question')
		: i18n.baseText('agents.chat.delegate.answer');
	return [
		`**${i18n.baseText('agents.chat.delegate.request')}**`,
		sent,
		`**${answerLabel}**`,
		answer,
	].join('\n\n');
}

function formatExpandableDetails(
	toolName: string,
	input: unknown,
	output: unknown,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (isDelegateSubAgentTool(toolName)) {
		return formatDelegateDetails(input, output, i18n);
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
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'> & Partial<Pick<ToolCall, 'input'>>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): string | undefined {
	if (!isSettledState(tc.state)) return undefined;
	return formatExpandableDetails(tc.tool, tc.input, tc.output, i18n, subAgentNameById);
}

export function isToolCallExpandable(
	tc: Pick<ToolCall, 'tool' | 'output' | 'state'> & Partial<Pick<ToolCall, 'input'>>,
	i18n?: WriteTodosI18n,
	subAgentNameById?: Map<string, string>,
): boolean {
	return getToolCallDetails(tc, i18n, subAgentNameById) !== undefined;
}
