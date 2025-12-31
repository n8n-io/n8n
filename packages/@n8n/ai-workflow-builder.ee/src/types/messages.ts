/**
 * Quick reply option for chat messages
 */
export interface QuickReplyOption {
	text: string;
	type: string;
	isFeedback?: boolean;
}

/**
 * Assistant chat message
 */
export interface AssistantChatMessage {
	role: 'assistant';
	type: 'message';
	text: string;
	step?: string;
	codeSnippet?: string;
}

/**
 * Assistant summary message
 */
export interface AssistantSummaryMessage {
	role: 'assistant';
	type: 'summary';
	title: string;
	content: string;
}

/**
 * End session event message
 */
export interface EndSessionMessage {
	role: 'assistant';
	type: 'event';
	eventName: 'end-session';
}

/**
 * Agent suggestion message
 */
export interface AgentChatMessage {
	role: 'assistant';
	type: 'agent-suggestion';
	title: string;
	text: string;
}

/**
 * Prompt validation message
 */
export interface PromptValidationMessage {
	role: 'assistant';
	type: 'prompt-validation';
	isWorkflowPrompt: boolean;
	id: string;
}

/**
 * Union type for all possible message responses
 */
export type MessageResponse =
	| ((
			| AssistantChatMessage
			| AssistantSummaryMessage
			| AgentChatMessage
			| PromptValidationMessage
	  ) & {
			quickReplies?: QuickReplyOption[];
	  })
	| EndSessionMessage;
