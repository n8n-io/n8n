import type { InjectionKey } from 'vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

/**
 * Lets the chat host add one note to a tool-step row, for example who approved the call.
 * Returns undefined when the row needs no note. Without a provider, rows have no notes.
 */
export const AGENT_CHAT_TOOL_STEP_NOTE: InjectionKey<(toolCall: ToolCall) => string | undefined> =
	Symbol('agent-chat-tool-step-note');
