import type { InstanceAiToolCallState } from '@n8n/api-types';
import { defineAsyncComponent } from 'vue';

import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { parseAssistantConfirmationInput } from './assistantConfirmation';

/** The questions that a call asked the user, or `undefined` for every other call. */
export function getAskedQuestions(toolCall: ToolCall) {
	const input = parseAssistantConfirmationInput(toolCall.suspendPayload);
	return input?.inputType === 'questions' && input.questions?.length ? input.questions : undefined;
}

/**
 * A call of the current Assistant chat in the shape of the Agents chat, so
 * both chats render the same summary.
 */
export function toAnsweredQuestionsToolCall(toolCall: InstanceAiToolCallState): ToolCall {
	return {
		tool: toolCall.toolName,
		toolCallId: toolCall.toolCallId,
		state: TOOL_CALL_STATE.DONE,
		suspendPayload: toolCall.confirmation,
		output: toolCall.result,
	};
}

/**
 * Shows the questions and the answers of the user in place of the tool step,
 * so the answers stay visible after the questions card closes.
 */
export const assistantAnsweredQuestionsExtension: AgentsChatInteractionExtension = {
	key: 'assistant_answered_questions',
	matchToolResult: (toolCall) => getAskedQuestions(toolCall) !== undefined,
	resultComponent: defineAsyncComponent(
		async () => await import('@/features/ai/instanceAi/components/AnsweredQuestions.vue'),
	),
};
