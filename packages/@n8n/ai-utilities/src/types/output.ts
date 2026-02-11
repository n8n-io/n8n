import type { ContentMetadata, Message, MessageContent } from './message';

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

export interface GenerateResult {
	id?: string;
	finishReason?: FinishReason;
	usage?: TokenUsage;
	/**
	 * The generated message
	 */
	message: Message;
	/**
	 * Metadata about the response from the provider
	 */
	providerMetadata?: Record<string, unknown>;
	rawResponse?: unknown;
}

export type StreamChunk = ContentMetadata &
	(
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
				type: 'finish';
				finishReason: FinishReason;
				usage?: TokenUsage;
		  }
		| {
				type: 'error';
				error: unknown;
		  }
		| {
				type: 'content';
				content: MessageContent;
				id?: string;
		  }
	);
