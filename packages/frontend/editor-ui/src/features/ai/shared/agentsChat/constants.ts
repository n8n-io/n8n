/**
 * Status of an assistant message during/after streaming.
 * Used by `useAgentChatStream`, `agentChatMessages`, and templates.
 */
export const CHAT_MESSAGE_STATUS = {
	STREAMING: 'streaming',
	SUCCESS: 'success',
	ERROR: 'error',
	AWAITING_USER: 'awaitingUser',
} as const;
export type ChatMessageStatus = (typeof CHAT_MESSAGE_STATUS)[keyof typeof CHAT_MESSAGE_STATUS];

/**
 * Discriminant for a result card rendered from a `chat_action` → `show_card`
 * call. Not a tool name: the tool is still `chat_action`, but the payload
 * shape (a result card, display-only) differs from the rich-card payload
 * that shares the tool, so the interactive union needs its own tag.
 */
export const N8N_CHAT_RESULT_CARD_INTERACTION = 'chat_action:result-card' as const;

/**
 * Lifecycle of a single tool-call as the agent runs.
 * `pending` → `running` → `done|error`, or `running` → `suspended` → `done`.
 */
export const TOOL_CALL_STATE = {
	PENDING: 'pending',
	RUNNING: 'running',
	SUSPENDED: 'suspended',
	DONE: 'done',
	CANCELLED: 'cancelled',
	ERROR: 'error',
} as const;
export type ToolCallState = (typeof TOOL_CALL_STATE)[keyof typeof TOOL_CALL_STATE];
