import type {
	LanguageModelV4,
	LanguageModelV4CallOptions,
	LanguageModelV4GenerateResult,
	LanguageModelV4StreamPart,
	LanguageModelV4StreamResult,
} from '@ai-sdk/provider';
import { raceAbort } from '@n8n/utils/race-abort';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { AiSdkStreamConverter } from './ai-sdk-stream';
import { AiSdkCallTrace } from './ai-sdk-tracing';
import {
	bindCallTools,
	fromAiSdkCallOptions,
	toAiSdkFinishReason,
	toAiSdkUsage,
} from '../converters/ai-sdk-call';
import {
	fromAiSdkPrompt,
	toAiSdkContent,
	toAiSdkProviderMetadata,
} from '../converters/ai-sdk-message';
import type { ChatModel, ChatModelConfig } from '../types/chat-model';
import type { Message } from '../types/message';

/** Logs an error of the call as the output of the node, then rethrows it. */
async function failTraceOnError<T>(
	trace: AiSdkCallTrace | undefined,
	run: () => T | Promise<T>,
): Promise<T> {
	try {
		return await run();
	} catch (error) {
		await trace?.failed(error);
		throw error;
	}
}

/**
 * Runs an AI Node SDK `ChatModel` as a Vercel AI SDK language model. It targets
 * v4, the native specification of the `ai` release. v3 runs only for compatibility.
 */
export class AiSdkLanguageModelAdapter implements LanguageModelV4 {
	readonly specificationVersion = 'v4';

	/** The contract has no URL inputs, so the AI SDK downloads every file URL. */
	readonly supportedUrls: Record<string, RegExp[]> = {};

	/** With the context of a node, each call is written to the run data of that node. */
	constructor(
		private readonly chatModel: ChatModel,
		private readonly ctx?: ISupplyDataFunctions,
	) {}

	get provider(): string {
		return this.chatModel.provider;
	}

	get modelId(): string {
		return this.chatModel.modelId;
	}

	async doGenerate(options: LanguageModelV4CallOptions): Promise<LanguageModelV4GenerateResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		const trace = await this.startTrace(messages, config);
		return await failTraceOnError(trace, async () => {
			const generated = await model.generate(messages, config);
			const { content, warnings: contentWarnings } = toAiSdkContent(
				generated.message,
				this.provider,
			);
			const result: LanguageModelV4GenerateResult = {
				content,
				finishReason: toAiSdkFinishReason(generated.finishReason),
				usage: toAiSdkUsage(generated.usage),
				providerMetadata: toAiSdkProviderMetadata(this.provider, generated.providerMetadata),
				response: { id: generated.id, modelId: this.modelId },
				warnings: [...warnings, ...contentWarnings],
			};
			await trace?.generated(result);
			return result;
		});
	}

	async doStream(options: LanguageModelV4CallOptions): Promise<LanguageModelV4StreamResult> {
		const { model, messages, config, warnings } = this.prepareCall(options);
		const trace = await this.startTrace(messages, config);
		// Closing the iterator waits for a chunk that is in flight. Aborting the
		// request lets a cancel of the stream end that wait.
		const request = new AbortController();
		const abortSignal = options.abortSignal
			? AbortSignal.any([options.abortSignal, request.signal])
			: request.signal;
		const abortError = () => {
			const { reason } = abortSignal;
			return reason instanceof Error
				? reason
				: new Error('The call was aborted', { cause: reason });
		};
		const iterator = await failTraceOnError(trace, () =>
			model.stream(messages, { ...config, abortSignal })[Symbol.asyncIterator](),
		);
		// Closing the iterator frees the request when the model ignores the signal.
		const stopRequest = async () => {
			request.abort();
			await Promise.resolve(iterator.return?.()).catch(() => undefined);
		};
		const modelId = this.modelId;
		const converter = new AiSdkStreamConverter(this.provider, modelId);
		let reading = false;
		let cancelled = false;

		const stream = new ReadableStream<LanguageModelV4StreamPart>({
			start(controller) {
				controller.enqueue({ type: 'stream-start', warnings });
				controller.enqueue({ type: 'response-metadata', modelId });
			},
			async pull(controller) {
				const send = (parts: readonly LanguageModelV4StreamPart[]) => {
					for (const part of parts) {
						trace?.observe(part);
						controller.enqueue(part);
					}
				};
				// A pull that enqueues nothing is not called again, so read on until
				// a chunk gives parts or the chat model stream ends.
				while (true) {
					let parts: LanguageModelV4StreamPart[];
					reading = true;
					try {
						// A chat model can ignore the signal. Each read races it, so the
						// stream still ends when the call is aborted.
						const read = iterator.next();
						// An aborted race does not wait for the read, so its rejection is
						// observed here.
						void read.catch(() => undefined);
						const next = await raceAbort(read, abortSignal, abortError);
						// After a cancel the stream is closed, so a late chunk is dropped.
						if (cancelled) return;
						if (next.done) {
							send(converter.end());
							await trace?.streamed();
							controller.close();
							return;
						}
						parts = converter.convert(next.value);
					} catch (error) {
						if (cancelled) return;
						// A chunk that breaks the contract also stops the request it came from.
						void stopRequest();
						await trace?.failed(error);
						send(converter.fail(error));
						controller.close();
						return;
					} finally {
						reading = false;
					}

					send(parts);
					if (parts.length > 0) return;
				}
			},
			async cancel(reason: unknown) {
				cancelled = true;
				await trace?.failed(reason ?? new Error('The stream was cancelled'));
				// The iterator closes only after a pending read settles, and a chat
				// model that ignores the signal may never settle it. Do not wait then.
				const stopping = stopRequest();
				if (!reading) await stopping;
			},
		});

		return { stream };
	}

	private prepareCall(options: LanguageModelV4CallOptions) {
		const { model, warnings } = bindCallTools(this.chatModel, options);
		const { config, warnings: configWarnings } = fromAiSdkCallOptions(options);
		const prompt = fromAiSdkPrompt(options.prompt, this.provider);

		return {
			model,
			messages: prompt.messages,
			config,
			warnings: [...warnings, ...configWarnings, ...prompt.warnings],
		};
	}

	private async startTrace(
		messages: readonly Message[],
		config: ChatModelConfig,
	): Promise<AiSdkCallTrace | undefined> {
		return this.ctx
			? await AiSdkCallTrace.start(this.ctx, this.chatModel, messages, config)
			: undefined;
	}
}
