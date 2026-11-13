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
		// A chat model can ignore the signal. Each read races it, so the stream
		// still ends when the call is aborted.
		const aborted = new Promise<never>((_resolve, reject) => {
			const fail = () => {
				const { reason } = abortSignal;
				reject(
					reason instanceof Error ? reason : new Error('The call was aborted', { cause: reason }),
				);
			};
			if (abortSignal.aborted) fail();
			else abortSignal.addEventListener('abort', fail, { once: true });
		});
		void aborted.catch(() => undefined);
		const iterator = model.stream(messages, { ...config, abortSignal })[Symbol.asyncIterator]();
		const modelId = this.modelId;
		const converter = new AiSdkStreamConverter(this.provider, modelId);
		let reading = false;

		const stream = new ReadableStream<LanguageModelV4StreamPart>({
			start(controller) {
				controller.enqueue({ type: 'stream-start', warnings });
				controller.enqueue({ type: 'response-metadata', modelId });
			},
			async pull(controller) {
				// A pull that enqueues nothing is not called again, so read on until
				// a chunk gives parts or the chat model stream ends.
				while (true) {
					let parts: LanguageModelV4StreamPart[];
					reading = true;
					try {
						const next = await Promise.race([iterator.next(), aborted]);
						// After a cancel the stream is closed, so a late chunk is dropped.
						if (cancellation.signal.aborted) return;
						if (next.done) {
							for (const part of converter.end()) controller.enqueue(part);
							controller.close();
							return;
						}
						parts = converter.convert(next.value);
					} catch (error) {
						if (cancellation.signal.aborted) return;
						// A chunk that breaks the contract also stops the request it came from.
						// Closing the iterator frees the request when the model ignores the signal.
						cancellation.abort();
						void Promise.resolve(iterator.return?.()).catch(() => undefined);
						controller.enqueue({ type: 'error', error });
						controller.close();
						return;
					} finally {
						reading = false;
					}

					for (const part of parts) controller.enqueue(part);
					if (parts.length > 0) return;
				}
			},
			async cancel() {
				cancellation.abort();
				// The iterator closes only after a pending read settles, and a chat
				// model that ignores the signal may never settle it. Do not wait then.
				const closing = Promise.resolve(iterator.return?.()).catch(() => undefined);
				if (!reading) await closing;
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
