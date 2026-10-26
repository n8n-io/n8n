import type {
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3GenerateResult,
	LanguageModelV3StreamPart,
	LanguageModelV3StreamResult,
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
 * The adapter targets specification version v3 because that is the version
 * the `@n8n/agents` runtime consumes. `@ai-sdk/provider` already ships v4
 * types next to it; move to v4 together with the runtime, not before.
 */
export class AiSdkLanguageModelAdapter implements LanguageModelV3 {
	readonly specificationVersion = 'v3';

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

	async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		const result = await model.generate(messages, config);

		return {
			content: fromChatModelMessage(result.message),
			finishReason: toFinishReason(result.finishReason),
			usage: toUsage(result.usage),
			providerMetadata: toProviderMetadata(result.providerMetadata),
			response: { id: result.id, modelId: this.modelId },
			warnings,
		};
	}

	async doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		const iterator = model.stream(messages, config)[Symbol.asyncIterator]();
		const converter = new AiSdkStreamConverter();
		const modelId = this.modelId;

		const stream = new ReadableStream<LanguageModelV3StreamPart>({
			start(controller) {
				controller.enqueue({ type: 'stream-start', warnings });
				controller.enqueue({ type: 'response-metadata', modelId });
			},
			async pull(controller) {
				let next: IteratorResult<StreamChunk>;
				try {
					next = await iterator.next();
				} catch (error) {
					controller.enqueue({ type: 'error', error });
					controller.close();
					return;
				}

				const parts = next.done ? converter.end() : converter.convert(next.value);
				for (const part of parts) controller.enqueue(part);
				if (next.done) controller.close();
			},
			async cancel() {
				await iterator.return?.();
			},
		});

		return { stream };
	}

	private prepareCall(options: LanguageModelV3CallOptions) {
		const { model, warnings } = bindCallTools(this.chatModel, options);
		const prompt = toChatModelMessages(options.prompt);

		return {
			model,
			messages: prompt.messages,
			config: toChatModelConfig(options),
			warnings: [...warnings, ...prompt.warnings],
		};
	}
}
