import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';

import { AVG_CHARS_PER_TOKEN_ANTHROPIC } from '@/constants';

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

function concatenateMessageContent(messages: BaseMessage[]): string {
	return messages.reduce((acc: string, message) => {
		if (typeof message.content === 'string') {
			return acc + message.content;
		} else if (Array.isArray(message.content)) {
			return (
				acc +
				message.content.reduce((innerAcc: string, item) => {
					if (typeof item === 'object' && item !== null && 'text' in item) {
						return innerAcc + item.text;
					}
					return innerAcc;
				}, '')
			);
		}
		return acc;
	}, '');
}

export function estimateTokenCountFromString(text: string): number {
	return Math.ceil(text.length / AVG_CHARS_PER_TOKEN_ANTHROPIC); // Rough estimate
}

export function estimateTokenCountFromMessages(messages: BaseMessage[]): number {
	const entireInput = concatenateMessageContent(messages);

	return estimateTokenCountFromString(entireInput);
}
