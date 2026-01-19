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

export namespace ChatRequest {
	export interface NodeExecutionSchema {
		nodeName: string;
		schema: Schema;
	}

	export interface ExpressionValue {
		expression: string;
		resolvedValue?: unknown;
		nodeType: string;
	}

	export interface WorkflowContext {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowDb>;
		executionData?: IRunExecutionData['resultData'];
		expressionValues?: Record<string, ExpressionValue[]>;
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

	export interface BuilderFeatureFlags {
		templateExamples?: boolean;
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
		/** Builder mode: 'build' for direct workflow generation, 'plan' for planning first */
		mode?: 'build' | 'plan';
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
	// These are the raw formats sent by the backend
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

	export interface ApiAnswerSummaryMessage {
		role: 'assistant';
		type: 'answer_summary';
		answers: PlanMode.QuestionResponse[];
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
				| ApiAnswerSummaryMessage
		  ) & {
				quickReplies?: ChatUI.QuickReply[];
		  })
		| ChatUI.EndSessionMessage;

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
	/**
	 * Types for clarifying question in Plan Mode
	 */
	export type QuestionType = 'single' | 'multi' | 'text';

	export interface PlannerQuestion {
		id: string;
		question: string;
		type: QuestionType;
		options?: string[];
		allowCustom?: boolean;
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

	/**
	 * Custom message data for questions UI
	 */
	export interface QuestionsMessageData {
		questions: PlannerQuestion[];
		introMessage?: string;
	}

	/**
	 * Custom message data for plan display
	 */
	export interface PlanMessageData {
		plan: PlanOutput;
	}

	/**
	 * Custom message data for answer summary
	 */
	export interface AnswerSummaryMessageData {
		answers: QuestionResponse[];
	}

	/**
	 * Custom message types for Plan Mode
	 */
	export type QuestionsMessage = ChatUI.CustomMessage & {
		customType: 'questions';
		data: QuestionsMessageData;
	};

	export type PlanMessage = ChatUI.CustomMessage & {
		customType: 'plan';
		data: PlanMessageData;
	};

	export type AnswerSummaryMessage = ChatUI.CustomMessage & {
		customType: 'answer_summary';
		data: AnswerSummaryMessageData;
	};

	export type PlanModeMessage = QuestionsMessage | PlanMessage | AnswerSummaryMessage;
}

// Type guards for Plan Mode messages
export function isPlanModeQuestionsMessage(
	msg: ChatUI.AssistantMessage,
): msg is PlanMode.QuestionsMessage {
	return msg.type === 'custom' && 'customType' in msg && msg.customType === 'questions';
}

export function isPlanModePlanMessage(msg: ChatUI.AssistantMessage): msg is PlanMode.PlanMessage {
	return msg.type === 'custom' && 'customType' in msg && msg.customType === 'plan';
}

export function isPlanModeAnswerSummaryMessage(
	msg: ChatUI.AssistantMessage,
): msg is PlanMode.AnswerSummaryMessage {
	return msg.type === 'custom' && 'customType' in msg && msg.customType === 'answer_summary';
}

export function isPlanModeMessage(msg: ChatUI.AssistantMessage): msg is PlanMode.PlanModeMessage {
	return (
		isPlanModeQuestionsMessage(msg) ||
		isPlanModePlanMessage(msg) ||
		isPlanModeAnswerSummaryMessage(msg)
	);
}

// ============================================================================
// Type guards for ChatRequest messages
// ============================================================================

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
