export namespace ChatUI {
	export interface TextMessage {
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

	export interface GeneratedNodesMessage {
		role: 'assistant';
		type: 'workflow-node';
		nodes: string[];
	}

	export interface ComposedNodesMessage {
		role: 'assistant';
		type: 'workflow-composed';
		nodes: Array<{
			parameters: Record<string, unknown>;
			type: string;
			name: string;
			position: [number, number];
		}>;
	}

	export interface QuickReply {
		type: string;
		text: string;
		isFeedback?: boolean;
	}

	export interface ErrorMessage {
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

	export interface WorkflowStepMessage {
		role: 'assistant';
		type: 'workflow-step';
		steps: string[];
	}

	export interface WorkflowNodeMessage {
		role: 'assistant';
		type: 'workflow-node';
		nodes: string[];
	}

	export interface WorkflowComposedMessage {
		role: 'assistant';
		type: 'workflow-composed';
		nodes: Array<{
			parameters: Record<string, unknown>;
			type: string;
			name: string;
			position: [number, number];
		}>;
	}
	export interface WorkflowGeneratedMessage {
		role: 'assistant';
		type: 'workflow-generated';
		codeSnippet: string;
	}
	export interface RateWorkflowMessage {
		role: 'assistant';
		type: 'rate-workflow';
		content: string;
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
		| MessagesWithReplies
		| ErrorMessage
		| EndSessionMessage
		| SessionTimeoutMessage
		| SessionErrorMessage
		| AgentSuggestionMessage
		| WorkflowStepMessage
		| WorkflowNodeMessage
		| WorkflowComposedMessage
		| WorkflowGeneratedMessage
		| RateWorkflowMessage
	) & {
		id: string;
		read: boolean;
	};
}
