import type { AIMessageChunk, AIMessage } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { Logger } from '@n8n/backend-common';

import type { AgentMessageChunk, StreamChunk, StreamOutput } from '../types/streaming';

/**
 * Process a single chunk from the LangGraph stream
 */
export function processStreamChunk(chunk: AIMessageChunk, logger?: Logger): StreamOutput | null {
	const formattedMessages: StreamChunk[] = [];

	formattedMessages.push(...processAIMessageContent(chunk));

	if (formattedMessages.length === 0) {
		logger?.warn('Received unknown stream chunk', { chunk });
		return null;
	}

	return { messages: formattedMessages };
}

/**
 * Create a stream processor that yields formatted chunks
 */
export async function* createStreamProcessor(
	stream: IterableReadableStream<AIMessageChunk>,
	logger?: Logger,
): AsyncGenerator<StreamOutput> {
	for await (const chunk of stream) {
		const output = processStreamChunk(chunk, logger);

		if (output) {
			yield output;
		}
	}
}

/**
 * Process array content from AIMessage and return formatted text messages
 */
function processArrayContent(content: unknown[]): AgentMessageChunk[] {
	const textMessages = content.filter(
		(c): c is { type: string; text: string } =>
			typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c,
	);

	return textMessages.map((textMessage) => ({
		role: 'assistant',
		type: 'message',
		text: textMessage.text,
	}));
}

function processAIMessageContent(msg: AIMessage): AgentMessageChunk[] {
	if (!msg.content) {
		return [];
	}

	if (Array.isArray(msg.content)) {
		return processArrayContent(msg.content);
	}

	return [
		{
			role: 'assistant',
			type: 'message',
			text: msg.content,
		},
	];
}
