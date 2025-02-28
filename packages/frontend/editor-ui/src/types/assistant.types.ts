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
				payload: InitErrorHelper | InitSupportChat | InitCredHelp;
		  }
		| {
				payload: EventRequestPayload | UserChatMessage;
				sessionId: string;
		  };

	interface CodeDiffMessage {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		suggestionId: string;
		solution_count: number;
	}

	interface QuickReplyOption {
		text: string;
		type: string;
		isFeedback?: boolean;
	}

	interface AssistantChatMessage {
		role: 'assistant';
		type: 'message';
		text: string;
		step?: 'n8n_documentation' | 'n8n_forum';
		codeSnippet?: string;
	}

	interface AssistantSummaryMessage {
		role: 'assistant';
		type: 'summary';
		title: string;
		content: string;
	}

	interface EndSessionMessage {
		role: 'assistant';
		type: 'event';
		eventName: 'end-session';
	}

	interface AgentChatMessage {
		role: 'assistant';
		type: 'agent-suggestion';
		title: string;
		text: string;
	}

	interface AgentThinkingStep {
		role: 'assistant';
		type: 'intermediate-step';
		text: string;
		step: string;
	}

	export type MessageResponse =
		| ((
				| AssistantChatMessage
				| CodeDiffMessage
				| AssistantSummaryMessage
				| AgentChatMessage
				| AgentThinkingStep
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
