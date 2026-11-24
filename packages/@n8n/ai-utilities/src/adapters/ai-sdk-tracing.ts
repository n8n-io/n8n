import type {
	LanguageModelV4GenerateResult,
	LanguageModelV4StreamPart,
	LanguageModelV4Usage,
} from '@ai-sdk/provider';
import type { BaseMessage } from '@langchain/core/messages';
import { getBufferString } from '@langchain/core/messages';
import omit from 'lodash/omit';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { toLcMessage } from '../converters/message';
import type { ChatModel, ChatModelConfig } from '../types/chat-model';
import type { Message } from '../types/message';
import { N8nLlmTracing } from '../utils/n8n-llm-tracing';

/**
 * A LangChain tool message holds one tool result, so each result of a tool
 * message becomes a message of its own.
 */
function toLcMessages(messages: readonly Message[]): BaseMessage[] {
	return messages.flatMap((message) =>
		message.role === 'tool'
			? message.content
					.filter((block) => block.type === 'tool-result')
					.map((block) => toLcMessage({ ...message, content: [block] }))
			: [toLcMessage(message)],
	);
}

/**
 * Writes one AI SDK call to the run data of the node. It uses the tracing of
 * the LangChain adapter, so both adapters show the same input and output.
 */
export class AiSdkCallTrace {
	readonly #tracing: N8nLlmTracing;

	readonly #runId = randomUUID();

	#text = '';

	#usage?: LanguageModelV4Usage;

	/** The first error part of the stream. It is wrapped because an error can be any value. */
	#streamError?: { readonly error: unknown };

	/** A call is logged once, as an output or as an error. */
	#done = false;

	private constructor(tracing: N8nLlmTracing) {
		this.#tracing = tracing;
	}

	static async start(
		ctx: ISupplyDataFunctions,
		chatModel: Pick<ChatModel, 'provider' | 'modelId'>,
		messages: readonly Message[],
		config: ChatModelConfig,
	): Promise<AiSdkCallTrace> {
		const trace = new AiSdkCallTrace(new N8nLlmTracing(ctx));
		// The headers can carry credentials, and a signal is not data.
		const options = omit(config, ['abortSignal', 'headers']);
		await trace.#tracing.handleLLMStart(
			{
				lc: 1,
				type: 'constructor',
				id: ['n8n', 'ai-sdk', chatModel.provider],
				kwargs: { provider: chatModel.provider, model: chatModel.modelId, ...options },
			},
			[getBufferString(toLcMessages(messages))],
			trace.#runId,
			undefined,
			undefined,
			undefined,
			{ ls_model_type: 'chat', ls_model_name: chatModel.modelId },
		);
		return trace;
	}

	async generated(result: LanguageModelV4GenerateResult): Promise<void> {
		for (const part of result.content) {
			if (part.type === 'text') this.#text += part.text;
		}
		this.#usage = result.usage;
		await this.#log();
	}

	/** Collects the text, the usage and the first error of a stream part that is sent. */
	observe(part: LanguageModelV4StreamPart): void {
		switch (part.type) {
			case 'text-delta':
				this.#text += part.delta;
				break;
			case 'finish':
				this.#usage = part.usage;
				break;
			case 'error':
				this.#streamError ??= { error: part.error };
				break;
			default:
				break;
		}
	}

	/** A stream with an error part is logged as failed, although it did not throw. */
	async streamed(): Promise<void> {
		await (this.#streamError ? this.failed(this.#streamError.error) : this.#log());
	}

	async failed(error: unknown): Promise<void> {
		if (this.#done) return;
		this.#done = true;
		await this.#tracing.handleLLMError(
			error instanceof Error ? error : new Error(String(error)),
			this.#runId,
		);
	}

	async #log(): Promise<void> {
		if (this.#done) return;
		this.#done = true;
		const promptTokens = this.#usage?.inputTokens.total ?? 0;
		const completionTokens = this.#usage?.outputTokens.total ?? 0;
		await this.#tracing.handleLLMEnd(
			{
				generations: [[{ text: this.#text }]],
				llmOutput: {
					tokenUsage: {
						promptTokens,
						completionTokens,
						totalTokens: promptTokens + completionTokens,
					},
				},
			},
			this.#runId,
		);
	}
}
