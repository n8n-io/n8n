import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import type { AIMessageChunk } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import { ChatOpenAI } from '@langchain/openai';
import type { Logger } from '@n8n/backend-common';

import { ValidationError, LLMServiceError } from './errors';
import { createStreamProcessor } from './utils/stream-processor';

export interface OpenAiChatAgentConfig {
	apiKey: string;
	logger?: Logger;
	tracer?: LangChainTracer;
}

export interface ChatPayload {
	message: string;
	userId: string;
	messageId: string;
	sessionId: string;
	model: string;
}

export class OpenAiChatAgent {
	private apiKey: string;
	private logger?: Logger;
	private tracer?: LangChainTracer;
	private sessions: Map<string, InMemoryChatMessageHistory>;

	constructor(config: OpenAiChatAgentConfig) {
		this.apiKey = config.apiKey;
		this.logger = config.logger;
		this.tracer = config.tracer;

		// TODO: Better session management, maybe keys by userId + conversationId?
		this.sessions = new Map<string, InMemoryChatMessageHistory>();
	}

	async *ask(payload: ChatPayload, abortSignal?: AbortSignal) {
		const { runnable, streamConfig } = this.setupModelAndConfigs(payload, abortSignal);

		const input = payload.message;
		const system = 'You are a helpful AI assistant.';
		const prompt = ChatPromptTemplate.fromMessages([
			['system', '{system}'],
			new MessagesPlaceholder('history'),
			['human', '{input}'],
		]);

		const chain = prompt.pipe(runnable);

		const withHistory = new RunnableWithMessageHistory({
			runnable: chain,
			getMessageHistory: (sessionId: string) => {
				if (!this.sessions.has(sessionId)) {
					this.sessions.set(sessionId, new InMemoryChatMessageHistory());
				}

				return this.sessions.get(sessionId)!;
			},
			inputMessagesKey: 'input',
			historyMessagesKey: 'history',
		});

		try {
			const stream = await withHistory.stream({ system, input }, streamConfig);

			yield* this.processAgentStream(stream, runnable, payload.messageId);
		} catch (error: unknown) {
			this.handleStreamError(error);
		}
	}

	private setupModelAndConfigs(
		{ model, message, userId, sessionId }: ChatPayload,
		abortSignal?: AbortSignal,
	) {
		this.logger?.debug(
			`Starting chat with model ${model} for user ${userId} (${sessionId}): ${message}`,
		);

		const runnable = new ChatOpenAI({
			model,
			temperature: 0.2,
			apiKey: this.apiKey,
		});

		const streamConfig = {
			configurable: {
				sessionId,
			},
			streamMode: ['updates', 'custom'],
			recursionLimit: 50,
			signal: abortSignal,
			callbacks: this.tracer ? [this.tracer] : undefined,
		};

		return { runnable, streamConfig };
	}

	private handleStreamError(error: unknown): never {
		const invalidRequestErrorMessage = this.getInvalidRequestError(error);
		if (invalidRequestErrorMessage) {
			throw new ValidationError(invalidRequestErrorMessage);
		}

		throw error;
	}

	private async *processAgentStream(
		stream: IterableReadableStream<AIMessageChunk>,
		_agent: ChatOpenAI,
		messageId: string,
	) {
		try {
			const streamProcessor = createStreamProcessor(stream, messageId, this.logger);
			for await (const output of streamProcessor) {
				yield output;
			}

			this.logger?.debug('Agent stream processing completed');
			yield {
				messages: [{ role: 'assistant', type: 'complete', text: 'Stream processing completed' }],
			};
		} catch (error) {
			if (error instanceof Error) {
				// TODO: Better error handling
				throw new LLMServiceError('Failed to process agent stream', error);
			}
			throw error;
		}
	}

	private getInvalidRequestError(error: unknown): string | undefined {
		if (
			error instanceof Error &&
			'error' in error &&
			typeof error.error === 'object' &&
			error.error
		) {
			const innerError = error.error;
			if ('error' in innerError && typeof innerError.error === 'object' && innerError.error) {
				const errorDetails = innerError.error;
				if (
					'type' in errorDetails &&
					errorDetails.type === 'invalid_request_error' &&
					'message' in errorDetails &&
					typeof errorDetails.message === 'string'
				) {
					return errorDetails.message;
				}
			}
		}

		return undefined;
	}
}
