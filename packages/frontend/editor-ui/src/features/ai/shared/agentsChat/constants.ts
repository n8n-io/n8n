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
