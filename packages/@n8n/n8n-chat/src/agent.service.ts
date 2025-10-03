import type { AIMessageChunk } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
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
	model: string;
}

export class OpenAiChatAgent {
	private apiKey: string;
	private logger?: Logger;
	private tracer?: LangChainTracer;

	constructor(config: OpenAiChatAgentConfig) {
		this.apiKey = config.apiKey;
		this.logger = config.logger;
		this.tracer = config.tracer;
	}

	async *ask(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal) {
		const { agent, threadConfig, streamConfig } = this.setupAgentAndConfigs(
			payload,
			userId,
			abortSignal,
		);

		try {
			const stream = await this.createAgentStream(payload, streamConfig, agent);
			yield* this.processAgentStream(stream, agent, threadConfig);
		} catch (error: unknown) {
			this.handleStreamError(error);
		}
	}

	private setupAgentAndConfigs(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal) {
		this.logger?.debug(
			`Starting chat with model ${payload.model} for user ${userId}: ${payload.message}`,
		);

		const agent = new ChatOpenAI({
			model: payload.model,
			temperature: 0.2,
			apiKey: this.apiKey,
		});

		// TOOD: Do we want a session manager?
		const threadId = crypto.randomUUID();
		const threadConfig: RunnableConfig = {
			configurable: {
				thread_id: threadId,
			},
		};
		const streamConfig = {
			...threadConfig,
			streamMode: ['updates', 'custom'],
			recursionLimit: 50,
			signal: abortSignal,
			callbacks: this.tracer ? [this.tracer] : undefined,
		};

		return { agent, threadConfig, streamConfig };
	}

	private async createAgentStream(
		payload: ChatPayload,
		streamConfig: RunnableConfig,
		agent: ChatOpenAI,
	) {
		const prompt = 'You are a helpful AI agent.';
		return await agent.stream(
			[new SystemMessage(prompt), new HumanMessage({ content: payload.message })],
			streamConfig,
		);
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
		_threadConfig: RunnableConfig,
	) {
		try {
			const streamProcessor = createStreamProcessor(stream, this.logger);
			for await (const output of streamProcessor) {
				yield output;
			}
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
