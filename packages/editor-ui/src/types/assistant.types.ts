import type { Schema } from '@/Interface';
import type { INode } from 'n8n-workflow';

type QuickReplyType = 'new-suggestion' | 'not-resolved' | 'resolved';

export namespace ChatUI {
	interface WithQuickReplies {
		quickReplies?: Array<{
			type: string;
			label: string;
		}>;
	}

	export interface TextMessage extends WithQuickReplies {
		role: 'assistant' | 'user';
		type: 'text';
		title?: string;
		content: string;
	}

	export interface CodeDiffMessage extends WithQuickReplies {
		role: 'assistant';
		type: 'code-diff';
		description: string;
		codeDiff: string;
		replacing?: boolean;
		replaced?: boolean;
		error?: boolean;
	}

	export type AssistantMessage = TextMessage | CodeDiffMessage;
}

export namespace ChatRequest {
	interface NodeExecutionSchema {
		node_name: string;
		schema: Schema;
	}

	interface WorkflowContext {
		executionSchema?: NodeExecutionSchema[];
	}

	export interface ErrorContext {
		error: {
			message: string;
			node: INode;
			type?: string;
			description?: string;
			lineNumber?: number;
		};
	}

	export interface ErrorRequestPayload extends ErrorContext, WorkflowContext {
		type: 'init-error-help';
		user: {
			firstName: string;
		};
	}

	export type InteractionEventName =
		| 'errored-node-execution-success'
		| 'errored-node-errored-again';

	interface EventRequestPayload {
		type: 'event';
		event: InteractionEventName;
	}

	export interface UserChatMessage {
		type: 'user-message';
		content: string;
		quickReplyType?: QuickReplyType;
	}

	export type RequestPayload = EventRequestPayload | ErrorRequestPayload | UserChatMessage;

	interface CodeDiffMessage {
		type: 'code-diff';
		description: string;
		codeDiff: string;
		suggestionId: 'string';
		solution_count: number;
	}

	interface QuickReplyOption {
		action: 'quick-reply';
		message: string;
		type: QuickReplyType;
		isFeedback?: boolean;
	}

	interface AssistantChatMessage {
		type: 'assistant-message';
		content: string;
		title?: string;
		solution_count: number;
	}

	interface EndSessionMessage {
		type: 'end-session';
	}

	type MessageResponse = (AssistantChatMessage | CodeDiffMessage | EndSessionMessage) & {
		quickReplies?: QuickReplyOption[];
	};

	export interface ResponsePayload {
		sessionId: string;
		messages: MessageResponse[];
	}
}

export namespace ReplaceCodeRequest {
	export interface RequestPayload {
		sessionId: string;
		userId: string; // added in the backend
		suggestionId: string;
	}

	export interface ResponsePayload {
		nodeId: string;
		nodeName: string;
		parameters: {
			[key: string]: string;
		};
	}
}
