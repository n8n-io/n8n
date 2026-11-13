import { jsonParse, type JsonValue } from 'n8n-workflow';

/** The chat surface of a resumed turn. Each surface resumes with its own runtime. */
export type AgentChatResumeSurface = 'preview' | 'n8n-chat';

/** The answer to a suspended tool call in the chat of an agent. */
export interface AgentChatResumeRequest {
	kind: 'chat-resume';
	surface: AgentChatResumeSurface;
	agentId: string;
	projectId: string;
	userId: string;
	runId: string;
	toolCallId: string;
	/** Stored in a JSON column and sent to another process, so it must be JSON. */
	resumeData: JsonValue;
}

/**
 * One message to the webhook channel. The main authenticates the caller and
 * parses the body before it sends the turn, so no credential or header leaves
 * the main.
 */
export interface AgentWebhookRespondRequest {
	kind: 'webhook-respond';
	agentId: string;
	input: string;
	conversationId?: string;
	/** Approval URLs start with this. The main builds it, because it serves them. */
	approvalBaseUrl: string;
}

/** The decision of a webhook caller on one approval request. */
export interface AgentWebhookDecideRequest {
	kind: 'webhook-decide';
	agentId: string;
	conversationId: string;
	runId: string;
	toolCallId: string;
	decision: JsonValue;
	approvalBaseUrl: string;
}

/** The memory of an app visitor: one thread per app, visitor and session. */
export interface AgentAppMemory {
	threadId: string;
	resourceId: string;
}

/** One message of an app visitor. The main resolves the binding and the visitor first. */
export interface AgentAppChatRequest {
	kind: 'app-chat';
	agentId: string;
	projectId: string;
	sessionId: string;
	message: string;
	memory: AgentAppMemory;
}

/** The answer of an app visitor to a suspended tool call. */
export interface AgentAppResumeRequest {
	kind: 'app-resume';
	agentId: string;
	projectId: string;
	sessionId: string;
	runId: string;
	toolCallId: string;
	resumeData: JsonValue;
	threadId: string;
}

export type AgentTurnRequestPayload =
	| AgentChatResumeRequest
	| AgentWebhookRespondRequest
	| AgentWebhookDecideRequest
	| AgentAppChatRequest
	| AgentAppResumeRequest;

/** Normalize a value from a request body into JSON that a worker can read. */
export function toResumeJson(value: unknown): JsonValue {
	if (value === undefined) return null;
	return jsonParse<JsonValue>(JSON.stringify(value));
}
