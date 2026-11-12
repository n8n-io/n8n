import type {
	LanguageModelV4,
	LanguageModelV4CallOptions,
	LanguageModelV4GenerateResult,
	LanguageModelV4StreamPart,
	LanguageModelV4StreamResult,
} from '@ai-sdk/provider';

import { AiSdkStreamConverter } from './ai-sdk-stream';
import {
	bindCallTools,
	toChatModelConfig,
	toFinishReason,
	toUsage,
} from '../converters/ai-sdk-call';
import {
	fromChatModelMessage,
	toChatModelMessages,
	toProviderMetadata,
} from '../converters/ai-sdk-message';
import type { ChatModel } from '../types/chat-model';
import type { StreamChunk } from '../types/output';

/**
 * Runs an AI Node SDK `ChatModel` as a Vercel AI SDK language model.
 *
 * The adapter targets specification version v4, the native version of the
 * `@ai-sdk/provider` release that `ai` depends on. The AI SDK accepts v3
 * models only for compatibility.
 */
export class AiSdkLanguageModelAdapter implements LanguageModelV4 {
	readonly specificationVersion = 'v4';

	/**
	 * The chat model contract has no notion of URL inputs, so no URL is
	 * declared as supported. The AI SDK then downloads every file URL and
	 * passes the bytes to the model.
	 */
	readonly supportedUrls: Record<string, RegExp[]> = {};

	constructor(private readonly chatModel: ChatModel) {}

	get provider(): string {
		return this.chatModel.provider;
	}

	get modelId(): string {
		return this.chatModel.modelId;
	}

	async doGenerate(options: LanguageModelV4CallOptions): Promise<LanguageModelV4GenerateResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		const result = await model.generate(messages, config);

		return {
			content: fromChatModelMessage(result.message, this.provider),
			finishReason: toFinishReason(result.finishReason),
			usage: toUsage(result.usage),
			providerMetadata: toProviderMetadata(this.provider, result.providerMetadata),
			response: { id: result.id, modelId: this.modelId },
			warnings,
		};
	}

	async doStream(options: LanguageModelV4CallOptions): Promise<LanguageModelV4StreamResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		// Closing the iterator waits for a chunk that is in flight. Aborting the
		// call lets a cancel of the stream end that wait.
		const cancellation = new AbortController();
		const abortSignal = options.abortSignal
			? AbortSignal.any([options.abortSignal, cancellation.signal])
			: cancellation.signal;
		const iterator = model.stream(messages, { ...config, abortSignal })[Symbol.asyncIterator]();
		const converter = new AiSdkStreamConverter(this.provider);
		const modelId = this.modelId;

		const stream = new ReadableStream<LanguageModelV4StreamPart>({
			start(controller) {
				controller.enqueue({ type: 'stream-start', warnings });
				controller.enqueue({ type: 'response-metadata', modelId });
			},
			async pull(controller) {
				// A pull that enqueues nothing is not called again, so read on until
				// a chunk gives parts or the chat model stream ends.
				while (true) {
					let next: IteratorResult<StreamChunk>;
					try {
						next = await iterator.next();
					} catch (error) {
						controller.enqueue({ type: 'error', error });
						controller.close();
						return;
					}

					if (next.done) {
						for (const part of converter.end()) controller.enqueue(part);
						controller.close();
						return;
					}

					const parts = converter.convert(next.value);
					for (const part of parts) controller.enqueue(part);
					if (parts.length > 0) return;
				}
			},
			async cancel() {
				cancellation.abort();
				await iterator.return?.();
			},
		});

		return { stream };
	}

	private prepareCall(options: LanguageModelV4CallOptions) {
		const { model, warnings } = bindCallTools(this.chatModel, options);
		const { config, warnings: configWarnings } = toChatModelConfig(options);
		const prompt = toChatModelMessages(options.prompt, this.provider);

		return {
			model,
			messages: prompt.messages,
			config,
			warnings: [...warnings, ...configWarnings, ...prompt.warnings],
		};
	}
}
