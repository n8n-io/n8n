/** Author of a chat message: the person who chats, or the agent. */
export const CHAT_MESSAGE_ROLE = {
	USER: 'user',
	ASSISTANT: 'assistant',
} as const;
export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLE)[keyof typeof CHAT_MESSAGE_ROLE];

/**
 * Where an assistant message shows a host event:
 * - `start`: above the text and tool steps of the message, in arrival order.
 * - `end`: below the text and tool steps of the message, in arrival order.
 * - `transient`: after the `end` events, only while the turn runs or waits for
 *   the user and the message has no text. A finished turn hides it.
 * - `thinking`: in the thinking block of the message, before the reasoning. A
 *   message without a thinking block shows it as a `start` event.
 */
export const HOST_EVENT_PLACEMENT = {
	START: 'start',
	END: 'end',
	TRANSIENT: 'transient',
	THINKING: 'thinking',
} as const;
export type HostEventPlacement = (typeof HOST_EVENT_PLACEMENT)[keyof typeof HOST_EVENT_PLACEMENT];

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

/**
 * Placeholder `toolName` of a card that a host extension parsed. It is not a
 * real agent tool: the extension's `parse` accepts any tool call, and the
 * payload's `extensionKey` names the extension that renders it.
 */
export const INTERACTION_EXTENSION_TOOL_NAME = 'interaction_extension';
