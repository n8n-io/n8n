/**
 * Canonical event schema the cloud agent emits over SSE. Mirrors
 * AgentEvent in ai-assistant-service backend/src/agent/runtime/agent-event.ts.
 * Kept hand-typed (instead of importing from a shared package) until we have
 * a stable shape — the reducer is the only place that interprets the data.
 */
export type CloudAgentEvent =
	| { type: 'run-start'; runId: string; threadId: string; ts: number }
	| { type: 'text-delta'; runId: string; delta: string }
	| {
			type: 'tool-call';
			runId: string;
			toolCallId: string;
			name: string;
			args: unknown;
			family: 'sandbox' | 'n8n';
	  }
	| {
			type: 'tool-result';
			runId: string;
			toolCallId: string;
			output: unknown;
			isError: boolean;
	  }
	| {
			type: 'run-finish';
			runId: string;
			status: 'completed' | 'cancelled' | 'errored';
			usage?: { inputTokens: number; outputTokens: number };
	  }
	| { type: 'run-error'; runId: string; message: string };

export type CloudAgentMessageRole = 'user' | 'assistant';

export interface CloudAgentToolCall {
	toolCallId: string;
	name: string;
	args: unknown;
	family: 'sandbox' | 'n8n';
	result?: { output: unknown; isError: boolean };
}

export interface CloudAgentAssistantMessage {
	id: string;
	role: 'assistant';
	runId: string;
	text: string;
	toolCalls: CloudAgentToolCall[];
	finishedAt?: number;
}

export interface CloudAgentUserMessage {
	id: string;
	role: 'user';
	content: string;
	createdAt: number;
}

export type CloudAgentMessage = CloudAgentUserMessage | CloudAgentAssistantMessage;
