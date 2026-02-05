import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { BindToolsInput } from '@langchain/core/language_models/chat_models';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, ContentBlock } from '@langchain/core/messages';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import type { Runnable } from '@langchain/core/runnables';

import { fromLcMessage } from '../converters/message';
import { fromLcTool } from '../converters/tool';
import type { ChatModel, ChatModelConfig } from '../types/chat-model';

export class LangchainAdapter<
	CallOptions extends ChatModelConfig = ChatModelConfig,
> extends BaseChatModel<CallOptions> {
	constructor(private chatModel: ChatModel) {
		super({
			// TODO: Move N8nLlmTracing to ai-utilities
			// callbacks: [new N8nLlmTracing(this)],
		});
	}

	_llmType(): string {
		return 'n8n-chat-model';
	}

	async _generate(
		messages: BaseMessage[],
		options: this['ParsedCallOptions'],
	): Promise<ChatResult> {
		// Convert LangChain messages to generic messages
		const transformedMessages = messages.map(fromLcMessage);
		const result = await this.chatModel.generate(transformedMessages, options);
		// Build content blocks for the message
		const content: ContentBlock[] = [];
		if (result.text) {
			content.push({
				type: 'text',
				text: result.text,
			});
		}

		// Build usage metadata
		const usage_metadata = result.usage
			? {
					input_tokens: result.usage.promptTokens ?? 0,
					output_tokens: result.usage.completionTokens ?? 0,
					total_tokens: result.usage.totalTokens ?? 0,
					input_token_details: result.usage.input_token_details,
					output_token_details: result.usage.output_token_details,
				}
			: undefined;

		// Convert tool calls to LangChain format
		const tool_calls =
			result.toolCalls?.map((tc) => ({
				id: tc.id,
				name: tc.name,
				args: tc.arguments,
				type: 'tool_call' as const,
			})) ?? [];

		// Convert back to LangChain format
		const aiMessage = new AIMessage({
			content,
			usage_metadata,
			response_metadata: {
				...result.providerMetadata,
				model: this.chatModel.modelId,
				provider: this.chatModel.provider,
			},
			id: result.id,
			tool_calls,
		});

		return {
			generations: [
				{
					text: result.text,
					message: aiMessage,
				},
			],
			llmOutput: {
				id: result.id,
				estimatedTokenUsage: usage_metadata,
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
			if (chunk.type === 'text-delta' && chunk.textDelta) {
				const content: ContentBlock[] = [
					{
						type: 'text',
						text: chunk.textDelta,
					},
				];

				const chunkResult = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content,
						usage_metadata: chunk.usage
							? {
									input_tokens: chunk.usage.promptTokens ?? 0,
									output_tokens: chunk.usage.completionTokens ?? 0,
									total_tokens: chunk.usage.totalTokens ?? 0,
								}
							: undefined,
					}),
					text: chunk.textDelta,
				});
				yield chunkResult;
				await runManager?.handleLLMNewToken(
					chunkResult.text ?? '',
					{
						prompt: 0,
						completion: 0,
					},
					undefined,
					undefined,
					undefined,
					{ chunk: chunkResult },
				);
			} else if (chunk.type === 'tool-call-delta' && chunk.toolCallDelta) {
				const tool_call_chunks = [
					{
						type: 'tool_call_chunk' as const,
						id: chunk.toolCallDelta.id,
						name: chunk.toolCallDelta.name,
						args: chunk.toolCallDelta.argumentsDelta,
						index: 0,
					},
				];

				const chunkResult = new ChatGenerationChunk({
					message: new AIMessageChunk({
						content: '',
						tool_call_chunks,
					}),
					text: '',
				});
				yield chunkResult;
			} else if (chunk.type === 'finish') {
				const usage_metadata = chunk.usage
					? {
							input_tokens: chunk.usage.promptTokens ?? 0,
							output_tokens: chunk.usage.completionTokens ?? 0,
							total_tokens: chunk.usage.totalTokens ?? 0,
						}
					: undefined;

				const chunkResult = new ChatGenerationChunk({
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
				yield chunkResult;
			}
		}
	}

	bindTools(
		tools: BindToolsInput[],
	): Runnable<BaseLanguageModelInput, AIMessageChunk, CallOptions> {
		const genericTools = tools.map(fromLcTool);
		const newModel = this.chatModel.withTools(genericTools);
		const newAdapter = new LangchainAdapter(newModel);

		return newAdapter as any;
	}
}
