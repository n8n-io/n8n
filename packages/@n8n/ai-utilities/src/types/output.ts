import type { Message } from './message';
import type { ToolCall } from './tool';

export interface GenerateResult {
	id?: string;
	text: string;
	finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		input_token_details?: {
			cache_read?: number;
		};
		output_token_details?: {
			reasoning?: number;
		};
	};
	/**
	 * Tool calls made by the model
	 */
	toolCalls?: ToolCall[];
	/**
	 * The generated message
	 */
	message?: Message;
	/**
	 * Metadata about the response from the provider
	 */
	providerMetadata?: Record<string, unknown>;
	rawResponse?: unknown;
}

export interface StreamChunk {
	type: 'text-delta' | 'tool-call-delta' | 'finish' | 'error';
	textDelta?: string;
	toolCallDelta?: {
		id?: string;
		name?: string;
		argumentsDelta?: string;
	};
	finishReason?: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	error?: unknown;
}
