import type { VIEWS } from '@/app/constants';
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
import type { FrontendSettings } from '@n8n/api-types';

export namespace ChatRequest {
	export interface NodeExecutionSchema {
		nodeName: string;
		schema: Schema;
	}

	export interface ExpressionValue {
		expression: string;
		resolvedValue?: unknown;
		nodeType: string;
		/** Parameter path where the expression is located (e.g., 'url', 'headers.authorization') */
		parameterPath?: string;
	}

	/**
	 * Context for a node selected/focused by the user.
	 * Used for focused nodes feature - allows user to select specific nodes
	 * for the AI to prioritize in its responses.
	 *
	 * Note: Only contains additional context not already in currentWorkflow.nodes.
	 * The LLM should look up full node details (type, parameters, etc.) by matching
	 * the `name` field against currentWorkflow.nodes[].name.
	 */
	export interface SelectedNodeContext {
		/** Node display name - use to look up full node in currentWorkflow.nodes */
		name: string;
		/** Configuration issues/validation errors on the node (not in currentWorkflow) */
		issues?: Record<string, string[]>;
		/** Names of nodes that connect INTO this node (pre-resolved for convenience) */
		incomingConnections: string[];
		/** Names of nodes that this node connects TO (pre-resolved for convenience) */
		outgoingConnections: string[];
	}

	export interface WorkflowContext {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowDb>;
		executionData?: IRunExecutionData['resultData'];
		expressionValues?: Record<string, ExpressionValue[]>;
		/** Whether execution schema values were excluded (redacted) for privacy */
		valuesExcluded?: boolean;
		/** Node names whose output schema was derived from pin data */
		pinnedNodes?: string[];
		/** Nodes explicitly selected/focused by the user for AI context */
		selectedNodes?: SelectedNodeContext[];
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
		context?: Pick<UserContext, 'aiUsageSettings'>;
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

	export interface BuilderFeatureFlags {
		templateExamples?: boolean;
		codeBuilder?: boolean;
		pinData?: boolean;
		planMode?: boolean;
	}

	export interface UserChatMessage {
		role: 'user';
		type: 'message';
		text: string;
		id: string;
		quickReplyType?: string;
		context?: UserContext;
		workflowContext?: WorkflowContext;
		featureFlags?: BuilderFeatureFlags;
		/** Builder mode: 'build' for direct generation, 'plan' for planning first */
		mode?: 'build' | 'plan';
		/** Resume payload for LangGraph interrupt() */
		resumeData?: unknown;
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
		aiUsageSettings?: FrontendSettings['ai'];
	}

	export type AssistantContext = UserContext & WorkflowContext;

	export type RequestPayload =
		| {
				payload: InitErrorHelper | InitSupportChat | InitCredHelp;
		  }
		| {
				payload: EventRequestPayload | UserChatMessage;
				sessionId?: string;
		  };

	// Re-export types from design-system for backward compatibility
	export type ToolMessage = ChatUI.ToolMessage;

	// API-specific types that extend UI types
	export interface CodeDiffMessage extends ChatUI.CodeDiffMessage {
		solution_count?: number;
		quickReplies?: ChatUI.QuickReply[];
	}

	export interface AgentThinkingStep {
		role: 'assistant';
		type: 'intermediate-step';
		text: string;
		step: string;
	}

	// API-specific types that extend UI types
	export interface TextMessage {
		role: 'assistant' | 'user';
		type: 'message'; // API uses 'message' instead of 'text'
		text: string;
		step?: 'n8n_documentation' | 'n8n_forum';
		codeSnippet?: string;
		quickReplies?: ChatUI.QuickReply[];
		/** Version ID for restore functionality - sent by backend on user messages */
		revertVersionId?: string;
		/** Version info enriched by frontend with timestamp from workflow history */
		revertVersion?: {
			id: string;
			createdAt: string;
		};
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

	// API-only types for Plan Mode messages
	export interface ApiQuestionsMessage {
		role: 'assistant';
		type: 'questions';
		questions: PlanMode.PlannerQuestion[];
		introMessage?: string;
	}

	export interface ApiPlanMessage {
		role: 'assistant';
		type: 'plan';
		plan: PlanMode.PlanOutput;
	}

	export interface ApiUserAnswersMessage {
		role: 'user';
		type: 'user_answers';
		answers: PlanMode.QuestionResponse[];
	}

	export interface MessagesCompactedEvent {
		type: 'messages-compacted';
	}

	// API-only types
	export type MessageResponse =
		| ((
				| TextMessage
				| CodeDiffMessage
				| SummaryMessage
				| AgentSuggestionMessage
				| AgentThinkingStep
				| ChatUI.WorkflowUpdatedMessage
				| ToolMessage
				| ChatUI.ErrorMessage
				| ApiQuestionsMessage
				| ApiPlanMessage
				| ApiUserAnswersMessage
		  ) & {
				quickReplies?: ChatUI.QuickReply[];
		  })
		| ChatUI.EndSessionMessage
		| MessagesCompactedEvent;

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

// ============================================================================
// Plan Mode Types
// ============================================================================

export namespace PlanMode {
	export type QuestionType = 'single' | 'multi' | 'text';

	export interface PlannerQuestion {
		id: string;
		question: string;
		type: QuestionType;
		options?: string[];
	}

	export interface QuestionResponse {
		questionId: string;
		question: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}

	export interface PlanStep {
		description: string;
		subSteps?: string[];
		suggestedNodes?: string[];
	}

	export interface PlanOutput {
		summary: string;
		trigger: string;
		steps: PlanStep[];
		additionalSpecs?: string[];
	}

	export interface QuestionsMessageData {
		questions: PlannerQuestion[];
		introMessage?: string;
	}

	export interface PlanMessageData {
		plan: PlanOutput;
	}

	export interface UserAnswersMessageData {
		answers: QuestionResponse[];
	}

	export type QuestionsMessage = ChatUI.CustomMessage & {
		customType: 'questions';
		data: QuestionsMessageData;
	};

	export type PlanMessage = ChatUI.CustomMessage & {
		customType: 'plan';
		data: PlanMessageData;
	};

	export type UserAnswersMessage = ChatUI.CustomMessage & {
		role: 'user';
		customType: 'user_answers';
		data: UserAnswersMessageData;
	};

	export type PlanModeMessage = QuestionsMessage | PlanMessage | UserAnswersMessage;
}

// Type guards for Plan Mode custom messages
export function isPlanModeQuestionsMessage(
	msg: ChatUI.AssistantMessage,
): msg is PlanMode.QuestionsMessage {
	return msg.type === 'custom' && 'customType' in msg && msg.customType === 'questions';
}

export function isPlanModePlanMessage(msg: ChatUI.AssistantMessage): msg is PlanMode.PlanMessage {
	return msg.type === 'custom' && 'customType' in msg && msg.customType === 'plan';
}

export function isPlanModeUserAnswersMessage(
	msg: ChatUI.AssistantMessage,
): msg is PlanMode.UserAnswersMessage {
	return (
		msg.type === 'custom' &&
		msg.role === 'user' &&
		'customType' in msg &&
		msg.customType === 'user_answers'
	);
}

export function isPlanModeMessage(msg: ChatUI.AssistantMessage): msg is PlanMode.PlanModeMessage {
	return (
		isPlanModeQuestionsMessage(msg) ||
		isPlanModePlanMessage(msg) ||
		isPlanModeUserAnswersMessage(msg)
	);
}

export type AssistantProcessOptions = {
	excludeParameterValues?: boolean;
};

// Type guards for ChatRequest messages
export function isTextMessage(msg: ChatRequest.MessageResponse): msg is ChatRequest.TextMessage {
	return 'type' in msg && msg.type === 'message' && 'text' in msg;
}

/** TextMessage with revertVersionId that can be transformed */
export type TextMessageWithRevertVersionId = ChatRequest.TextMessage & { revertVersionId: string };

export function hasRevertVersionId(
	msg: ChatRequest.MessageResponse,
): msg is TextMessageWithRevertVersionId {
	return isTextMessage(msg) && typeof msg.revertVersionId === 'string';
}

export function isSummaryMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.SummaryMessage {
	return 'type' in msg && msg.type === 'summary' && 'title' in msg && 'content' in msg;
}

export function isAgentSuggestionMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.AgentSuggestionMessage {
	return 'type' in msg && msg.type === 'agent-suggestion' && 'title' in msg && 'text' in msg;
}

export function isAgentThinkingMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.AgentThinkingStep {
	return 'type' in msg && msg.type === 'intermediate-step' && 'step' in msg;
}

export function isCodeDiffMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.CodeDiffMessage {
	return 'type' in msg && msg.type === 'code-diff' && 'codeDiff' in msg;
}

export function isWorkflowUpdatedMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatUI.WorkflowUpdatedMessage {
	return 'type' in msg && msg.type === 'workflow-updated' && 'codeSnippet' in msg;
}

export function isToolMessage(msg: ChatRequest.MessageResponse): msg is ChatRequest.ToolMessage {
	return 'type' in msg && msg.type === 'tool' && 'toolName' in msg && 'status' in msg;
}

export function isEndSessionMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatUI.EndSessionMessage {
	return 'type' in msg && msg.type === 'event' && msg.eventName === 'end-session';
}

export function isQuestionsMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.ApiQuestionsMessage {
	return 'type' in msg && msg.type === 'questions' && 'questions' in msg;
}

export function isPlanMessage(msg: ChatRequest.MessageResponse): msg is ChatRequest.ApiPlanMessage {
	return 'type' in msg && msg.type === 'plan' && 'plan' in msg;
}

export function isUserAnswersMessage(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.ApiUserAnswersMessage {
	return 'type' in msg && msg.type === 'user_answers' && 'answers' in msg;
}

export function isMessagesCompactedEvent(
	msg: ChatRequest.MessageResponse,
): msg is ChatRequest.MessagesCompactedEvent {
	return 'type' in msg && msg.type === 'messages-compacted';
}
