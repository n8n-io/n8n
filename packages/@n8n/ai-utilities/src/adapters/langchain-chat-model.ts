import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { BindToolsInput } from '@langchain/core/language_models/chat_models';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, ContentBlock } from '@langchain/core/messages';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import type { ChatResult, LLMResult } from '@langchain/core/outputs';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import type { Runnable } from '@langchain/core/runnables';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { fromLcMessage, toLcMessage } from '../converters/message';
import { fromLcTool } from '../converters/tool';
import type { ChatModel, ChatModelConfig } from '../types/chat-model';
import { makeN8nLlmFailedAttemptHandler } from '../utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../utils/n8n-llm-tracing';

export class LangchainAdapter<
	CallOptions extends ChatModelConfig = ChatModelConfig,
> extends BaseChatModel<CallOptions> {
	constructor(
		private chatModel: ChatModel,
		private ctx?: ISupplyDataFunctions,
	) {
		const params = {
			...(ctx
				? {
						callbacks: [
							new N8nLlmTracing(ctx, {
								tokensUsageParser: (result: LLMResult) => {
									const tokenUsage = result?.llmOutput?.tokenUsage as
										| AIMessage['usage_metadata']
										| undefined;
									const completionTokens = (tokenUsage?.output_tokens as number) ?? 0;
									const promptTokens = (tokenUsage?.input_tokens as number) ?? 0;

									return {
										completionTokens,
										promptTokens,
										totalTokens: completionTokens + promptTokens,
									};
								},
							}),
						],
						onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
					}
				: {}),
		};
		super(params);
	}

	_llmType(): string {
		return 'n8n-chat-model';
	}

	async _generate(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
	): Promise<ChatResult> {
		const transformedMessages = messages.map(fromLcMessage);
		const result = await this.chatModel.generate(transformedMessages, options);
		// Build content blocks for the message
		const lcMessage = toLcMessage(result.message);

		// Build usage metadata
		const usage_metadata = result.usage
			? {
					input_tokens: result.usage.promptTokens ?? 0,
					output_tokens: result.usage.completionTokens ?? 0,
					total_tokens: result.usage.totalTokens ?? 0,
					input_token_details: result.usage.inputTokenDetails
						? {
								cache_read: result.usage.inputTokenDetails.cacheRead,
							}
						: undefined,
					output_token_details: result.usage.outputTokenDetails
						? {
								reasoning: result.usage.outputTokenDetails.reasoning,
							}
						: undefined,
				}
			: undefined;

		if (AIMessage.isInstance(lcMessage)) {
			lcMessage.usage_metadata = usage_metadata;
		}

		lcMessage.response_metadata = {
			...result.providerMetadata,
			model: this.chatModel.modelId,
			provider: this.chatModel.provider,
		};

		return {
			generations: [
				{
					text: lcMessage.text,
					message: lcMessage,
				},
			],
			llmOutput: {
				id: result.id,
				tokenUsage: usage_metadata,
			},
		};
	}

	async *_streamResponseChunks(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
		runManager?: CallbackManagerForLLMRun,
	): AsyncGenerator<ChatGenerationChunk> {
		const genericMessages = messages.map(fromLcMessage);
		const stream = this.chatModel.stream(genericMessages, options);

		for await (const chunk of stream) {
			let lcChunk: ChatGenerationChunk | undefined = undefined;
			if (chunk.type === 'text-delta') {
				const content: ContentBlock[] = [
					{
						type: 'text',
						text: chunk.delta,
					},
				];

				lcChunk = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content,
					}),
					text: chunk.delta,
				});
			} else if (chunk.type === 'tool-call-delta') {
				const tool_call_chunks = [
					{
						type: 'tool_call_chunk' as const,
						id: chunk.id,
						name: chunk.name,
						args: chunk.argumentsDelta,
						index: 0,
					},
				];

				lcChunk = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content: '',
						tool_call_chunks,
					}),
					text: '',
				});
			} else if (chunk.type === 'finish') {
				const usage_metadata = chunk.usage
					? {
							input_tokens: chunk.usage.promptTokens ?? 0,
							output_tokens: chunk.usage.completionTokens ?? 0,
							total_tokens: chunk.usage.totalTokens ?? 0,
						}
					: undefined;

				lcChunk = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content: '',
						usage_metadata,
						response_metadata: {
							finish_reason: chunk.finishReason,
						},
					}),
					text: '',
					generationInfo: {
						finish_reason: chunk.finishReason,
					},
				});
			} else if (chunk.type === 'error') {
				lcChunk = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content: '',
						response_metadata: {
							finish_reason: 'error',
							error: chunk.error,
						},
					}),
					text: '',
					generationInfo: {
						finish_reason: 'error',
						error: chunk.error,
					},
				});
			} else if (chunk.type === 'content') {
				const lcMessage = toLcMessage({
					role: 'assistant',
					content: [chunk.content],
					id: chunk.id,
				});
				const lcMessageChunk = new AIMessageChunk({
					content: lcMessage.content,
					id: lcMessage.id,
					name: lcMessage.name,
				});
				lcChunk = new ChatGenerationChunk({
					message: lcMessageChunk,
					text: lcMessage.text,
				});
			}

			if (lcChunk) {
				yield lcChunk;
				await runManager?.handleLLMNewToken(
					lcChunk.text ?? '',
					{
						prompt: 0,
						completion: 0,
					},
					undefined,
					undefined,
					undefined,
					{ chunk: lcChunk },
				);
			}
		}
	}

	bindTools(
		tools: BindToolsInput[],
	): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions> {
		const genericTools = tools.map(fromLcTool);
		const newModel = this.chatModel.withTools(genericTools);
		const newAdapter = new LangchainAdapter(newModel, this.ctx);

		return newAdapter as any;
	}
}
