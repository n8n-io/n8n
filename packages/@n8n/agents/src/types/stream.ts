import type { AgentMessage, ContentMetadata } from '../message';

export type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';

export type TokenUsage<T extends Record<string, unknown> = Record<string, unknown>> = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	inputTokenDetails?: {
		cacheRead?: number;
	};
	outputTokenDetails?: {
		reasoning?: number;
	};
	additionalMetadata?: T;
};

export type StreamChunk = ContentMetadata &
	(
		| {
				type: 'finish';
				finishReason: FinishReason;
				usage?: TokenUsage;
		  }
		| {
				type: 'text-delta';
				id?: string;
				delta: string;
		  }
		| {
				type: 'reasoning-delta';
				id?: string;
				delta: string;
		  }
		| {
				type: 'tool-call-delta';
				id?: string;
				name?: string;
				argumentsDelta?: string;
		  }
		| {
				type: 'error';
				error: unknown;
		  }
		| {
				type: 'message';
				message: AgentMessage;
				id?: string;
		  }
		| {
				type: 'tool-call-suspended';
				runId?: string;
				toolCallId?: string;
				toolName?: string;
				input?: unknown;
				suspendPayload?: unknown;
		  }
	);
