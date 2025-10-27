export namespace ChatUI {
	export interface TextMessage {
		id?: string;
		role: 'assistant' | 'user';
		type: 'text';
		content: string;
		codeSnippet?: string;
	}

	export interface SummaryBlock {
		role: 'assistant';
		type: 'block';
		title: string;
		content: string;
	}

	export interface CodeDiffMessage {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		replacing?: boolean;
		replaced?: boolean;
		error?: boolean;
		suggestionId: string;
	}

	export interface EndSessionMessage {
		role: 'assistant';
		type: 'event';
		eventName: 'end-session';
	}

	export interface SessionTimeoutMessage {
		role: 'assistant';
		type: 'event';
		eventName: 'session-timeout';
	}

	export interface SessionErrorMessage {
		role: 'assistant';
		type: 'event';
		eventName: 'session-error';
	}

	export interface QuickReply {
		type: string;
		text: string;
		isFeedback?: boolean;
	}

	export interface ErrorMessage {
		id?: string;
		role: 'assistant';
		type: 'error';
		content: string;
		retry?: () => Promise<void>;
	}

	export interface AgentSuggestionMessage {
		role: 'assistant';
		type: 'agent-suggestion';
		title: string;
		content: string;
		suggestionId: string;
	}

	export interface WorkflowUpdatedMessage {
		role: 'assistant';
		type: 'workflow-updated';
		codeSnippet: string;
	}

	export interface ToolMessage {
		id?: string;
		role: 'assistant';
		type: 'tool';
		toolName: string;
		toolCallId?: string;
		displayTitle?: string; // tool display name like "Searching for node"
		customDisplayTitle?: string; // tool call specific custom title like "Searching for OpenAI"
		status: 'running' | 'completed' | 'error';
		updates: Array<{
			type: 'input' | 'output' | 'progress' | 'error';
			data: Record<string, unknown>;
			timestamp?: string;
		}>;
	}

	export interface CustomMessage {
		id?: string;
		role: 'assistant' | 'user';
		type: 'custom';
		message?: string;
		customType: string;
		data: unknown;
	}

	type MessagesWithReplies = (
		| TextMessage
		| CodeDiffMessage
		| SummaryBlock
		| AgentSuggestionMessage
	) & {
		quickReplies?: QuickReply[];
	};

	export type AssistantMessage = (
		| TextMessage
		| MessagesWithReplies
		| ErrorMessage
		| EndSessionMessage
		| SessionTimeoutMessage
		| SessionErrorMessage
		| AgentSuggestionMessage
		| WorkflowUpdatedMessage
		| ToolMessage
		| CustomMessage
	) & {
		id?: string;
		read?: boolean;
		showRating?: boolean;
		ratingStyle?: 'regular' | 'minimal';
		showFeedback?: boolean;
	};
}

export type RatingFeedback = { rating?: 'up' | 'down'; feedback?: string };

// Type guards for ChatUI messages
export function isTextMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.TextMessage & { id?: string; read?: boolean; quickReplies?: ChatUI.QuickReply[] } {
	return msg.type === 'text';
}

export function isSummaryBlock(msg: ChatUI.AssistantMessage): msg is ChatUI.SummaryBlock & {
	id?: string;
	read?: boolean;
	quickReplies?: ChatUI.QuickReply[];
} {
	return msg.type === 'block';
}

export function isCodeDiffMessage(msg: ChatUI.AssistantMessage): msg is ChatUI.CodeDiffMessage & {
	id?: string;
	read?: boolean;
	quickReplies?: ChatUI.QuickReply[];
} {
	return msg.type === 'code-diff';
}

export function isErrorMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.ErrorMessage & { id?: string; read?: boolean } {
	return msg.type === 'error';
}

export function isEndSessionMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.EndSessionMessage & { id?: string; read?: boolean } {
	return msg.type === 'event' && msg.eventName === 'end-session';
}

export function isSessionTimeoutMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.SessionTimeoutMessage & { id?: string; read?: boolean } {
	return msg.type === 'event' && msg.eventName === 'session-timeout';
}

export function isSessionErrorMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.SessionErrorMessage & { id?: string; read?: boolean } {
	return msg.type === 'event' && msg.eventName === 'session-error';
}

export function isAgentSuggestionMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.AgentSuggestionMessage & {
	id?: string;
	read?: boolean;
	quickReplies?: ChatUI.QuickReply[];
} {
	return msg.type === 'agent-suggestion';
}

export function isWorkflowUpdatedMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.WorkflowUpdatedMessage & { id?: string; read?: boolean } {
	return msg.type === 'workflow-updated';
}

export function isToolMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.ToolMessage & { id?: string; read?: boolean } {
	return msg.type === 'tool';
}

export function isCustomMessage(
	msg: ChatUI.AssistantMessage,
): msg is ChatUI.CustomMessage & { id?: string; read?: boolean } {
	return msg.type === 'custom';
}

// Helper to ensure message has required id and read properties
export function hasRequiredProps<T extends ChatUI.AssistantMessage>(
	msg: T,
): msg is T & { id: string; read: boolean } {
	return typeof msg.id === 'string' && typeof msg.read === 'boolean';
}

// Workflow suggestion interface for the N8nPromptInputSuggestions component
export interface WorkflowSuggestion {
	id: string;
	summary: string;
	prompt: string;
}
