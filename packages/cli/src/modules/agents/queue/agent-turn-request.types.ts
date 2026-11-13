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

export type AgentTurnRequestPayload = AgentChatResumeRequest;

/** Normalize resume data from a request body into JSON that a worker can read. */
export function toResumeJson(value: unknown): JsonValue {
	if (value === undefined) return null;
	return jsonParse<JsonValue>(JSON.stringify(value));
}
