import type { VIEWS } from '@/constants';
import type { IWorkflowDb, NodeAuthenticationOption, Schema } from '@/Interface';
import type {
	ExecutionError,
	ICredentialType,
	IDataObject,
	INode,
	INodeIssues,
	INodeParameters,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import type { ChatUI } from '@n8n/design-system/types/assistant';

export namespace ChatRequest {
	export interface NodeExecutionSchema {
		nodeName: string;
		schema: Schema;
	}

	export interface WorkflowContext {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowDb>;
		executionData?: IRunExecutionData['resultData'];
	}

	export interface ExecutionResultData {
		error?: ExecutionError;
		runData: Record<string, Array<Omit<ITaskData, 'data'>>>;
		lastNodeExecuted?: string;
		metadata?: Record<string, string>;
	}

	export interface ErrorContext {
		error: {
			name: string;
			message: string;
			type?: string;
			description?: string | null;
			lineNumber?: number;
			stack?: string;
		};
		node: INode;
		nodeInputData?: IDataObject;
	}

	export interface InitErrorHelper extends ErrorContext, WorkflowContext {
		role: 'user';
		type: 'init-error-helper';
		user: {
			firstName: string;
		};
		authType?: { name: string; value: string };
	}

	export interface InitSupportChat {
		role: 'user';
		type: 'init-support-chat';
		user: {
			firstName: string;
		};
		context?: UserContext & WorkflowContext;
		workflowContext?: WorkflowContext;
		question: string;
	}

	export interface InitBuilderChat {
		role: 'user';
		type: 'init-builder-chat';
		user: {
			firstName: string;
		};
		context?: UserContext & WorkflowContext;
		workflowContext?: WorkflowContext;
		question: string;
	}

	export interface InitCredHelp {
		role: 'user';
		type: 'init-cred-help';
		user: {
			firstName: string;
		};
		question: string;
		credentialType: {
			name: string;
			displayName: string;
		};
	}

	export type InteractionEventName = 'node-execution-succeeded' | 'node-execution-errored';

	interface EventRequestPayload {
		role: 'user';
		type: 'event';
		eventName: InteractionEventName;
		error?: ErrorContext['error'];
	}

	export interface UserChatMessage {
		role: 'user';
		type: 'message';
		text: string;
		quickReplyType?: string;
		context?: UserContext;
		workflowContext?: WorkflowContext;
	}

	export interface UserContext {
		activeNodeInfo?: {
			node?: INode;
			nodeIssues?: INodeIssues;
			nodeInputData?: IDataObject;
			referencedNodes?: NodeExecutionSchema[];
			executionStatus?: {
				status: string;
				error?: ErrorContext['error'];
			};
		};
		activeCredentials?: Pick<ICredentialType, 'name' | 'displayName'> & { authType?: string };
		currentView?: {
			name: VIEWS;
			description?: string;
		};
	}

	export type AssistantContext = UserContext & WorkflowContext;

	export type RequestPayload =
		| {
				payload: InitErrorHelper | InitSupportChat | InitCredHelp | InitBuilderChat;
		  }
		| {
				payload: EventRequestPayload | UserChatMessage;
				sessionId: string;
		  };

	// Re-export types from design-system for backward compatibility
	export type CodeDiffMessage = ChatUI.CodeDiffMessage;
	export type QuickReplyOption = ChatUI.QuickReply;
	export type EndSessionMessage = ChatUI.EndSessionMessage;
	export type AgentThinkingStep = ChatUI.AgentThinkingMessage;
	export type WorkflowStepMessage = ChatUI.WorkflowStepMessage;
	export type WorkflowNodeMessage = ChatUI.WorkflowNodeMessage;
	export type WorkflowComposedMessage = ChatUI.WorkflowComposedMessage;
	export type WorkflowGeneratedMessage = ChatUI.WorkflowGeneratedMessage;
	export type WorkflowUpdatedMessage = ChatUI.WorkflowUpdatedMessage;
	export type RateWorkflowMessage = ChatUI.RateWorkflowMessage;
	export type ToolMessage = ChatUI.ToolMessage;

	// API-specific types that extend UI types
	export interface TextMessage {
		role: 'assistant';
		type: 'message'; // API uses 'message' instead of 'text'
		text: string;
		step?: 'n8n_documentation' | 'n8n_forum';
		codeSnippet?: string;
		quickReplies?: QuickReplyOption[];
	}

	export interface SummaryMessage {
		role: 'assistant';
		type: 'summary'; // API uses 'summary' instead of 'block'
		title: string;
		content: string;
	}

	export interface AgentSuggestionMessage {
		role: 'assistant';
		type: 'agent-suggestion';
		title: string;
		text: string; // API uses text instead of content
		suggestionId?: string;
	}

	// API-only types
	export interface WorkflowPromptValidationMessage {
		role: 'assistant';
		type: 'prompt-validation';
		isWorkflowPrompt: boolean;
	}

	export type MessageResponse =
		| ((
				| TextMessage
				| CodeDiffMessage
				| SummaryMessage
				| AgentSuggestionMessage
				| AgentThinkingStep
				| WorkflowStepMessage
				| WorkflowNodeMessage
				| WorkflowComposedMessage
				| WorkflowPromptValidationMessage
				| WorkflowGeneratedMessage
				| WorkflowUpdatedMessage
				| RateWorkflowMessage
				| ToolMessage
		  ) & {
				quickReplies?: QuickReplyOption[];
		  })
		| EndSessionMessage;

	export interface ResponsePayload {
		sessionId?: string;
		messages: MessageResponse[];
	}

	export interface NodeInfo {
		authType?: NodeAuthenticationOption;
		schemas?: NodeExecutionSchema[];
		nodeInputData?: {
			inputNodeName?: string;
			inputData?: IDataObject;
		};
	}
}

export namespace ReplaceCodeRequest {
	export interface RequestPayload {
		sessionId: string;
		suggestionId: string;
	}

	export interface ResponsePayload {
		sessionId: string;
		parameters: INodeParameters;
	}
}

export namespace AskAiRequest {
	export interface RequestPayload {
		question: string;
		context: {
			schema: ChatRequest.NodeExecutionSchema[];
			inputSchema: ChatRequest.NodeExecutionSchema;
			pushRef: string;
			ndvPushRef: string;
		};
		forNode: 'code' | 'transform';
	}
}
