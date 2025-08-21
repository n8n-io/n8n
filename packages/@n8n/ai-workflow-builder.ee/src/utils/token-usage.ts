import { AIMessage } from '@langchain/core/messages';

export type AIMessageWithUsageMetadata = AIMessage & {
	response_metadata: {
		usage: {
			input_tokens: number;
			output_tokens: number;
			cache_read_input_tokens?: number;
			cache_creation_input_tokens?: number;
		};
	};
};

export interface TokenUsage {
	input_tokens: number;
	output_tokens: number;
}

/**
 * Extracts token usage information from the last AI assistant message
 */
export function extractLastTokenUsage(messages: unknown[]): TokenUsage | undefined {
	const lastAiAssistantMessage = messages.findLast(
		(m): m is AIMessageWithUsageMetadata =>
			m instanceof AIMessage &&
			m.response_metadata?.usage !== undefined &&
			'input_tokens' in m.response_metadata.usage &&
			'output_tokens' in m.response_metadata.usage,
	);

	if (!lastAiAssistantMessage) {
		return undefined;
	}

	return lastAiAssistantMessage.response_metadata.usage;
}
