import type { Schema } from '@/Interface';
import type { INode, INodeParameters } from 'n8n-workflow';

// export namespace ChatUI {
// 	interface WithQuickReplies {
// 		quickReplies?: Array<{
// 			type: string;
// 			label: string;
// 		}>;
// 	}

// 	export interface TextMessage extends WithQuickReplies {
// 		role: 'assistant' | 'user';
// 		type: 'text';
// 		title?: string;
// 		content: string;
// 	}

// 	export interface CodeDiffMessage extends WithQuickReplies {
// 		role: 'assistant';
// 		type: 'code-diff';
// 		description: string;
// 		codeDiff: string;
// 		suggestionId: string;
// 		replacing?: boolean;
// 		replaced?: boolean;
// 		error?: boolean;
// 	}

// 	// todo add quick replies here
// 	export type AssistantMessage = TextMessage | CodeDiffMessage;
// }

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
			name: string;
			message: string;
			type?: string;
			description?: string;
			lineNumber?: number;
			stack?: string;
		};
		node: INode;
	}

	export interface InitErrorHelper extends ErrorContext, WorkflowContext {
		role: 'user';
		type: 'init-error-helper';
		user: {
			firstName: string;
		};
	}

	export type InteractionEventName =
		| 'errored-node-execution-success'
		| 'errored-node-errored-again';

	interface EventRequestPayload {
		role: 'user';
		type: 'event';
		event: InteractionEventName;
	}

	export interface UserChatMessage {
		role: 'user';
		type: 'message';
		text: string;
		quickReplyType?: string;
	}

	export type RequestPayload =
		| InitErrorHelper
		| ((EventRequestPayload | UserChatMessage) & { sessionId: string });

	interface CodeDiffMessage {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		suggestionId: string;
		solution_count: number;
	}

	interface QuickReplyOption {
		content: string;
		type: string;
		isFeedback?: boolean;
	}

	interface AssistantChatMessage {
		role: 'assistant';
		type: 'message';
		content: string;
		title?: string;
	}

	interface EndSessionMessage {
		type: 'end-session';
	}

	export type MessageResponse = (AssistantChatMessage | CodeDiffMessage | EndSessionMessage) & {
		quickReplies?: QuickReplyOption[];
	};

	export interface ResponsePayload {
		sessionId?: string;
		messages: MessageResponse[];
	}
}

export namespace ReplaceCodeRequest {
	export interface RequestPayload {
		sessionId: string;
		suggestionId: string;
	}

	export interface ResponsePayload {
		parameters: INodeParameters;
	}
}
