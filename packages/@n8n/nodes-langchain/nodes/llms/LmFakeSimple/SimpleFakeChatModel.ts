import type { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { FakeChatModel, type FakeListChatModelCallOptions } from '@langchain/core/utils/testing';

import { ResponseManager } from './ResponseManager';
import type { FakeResponseItem, SimpleFakeResponse, ToolCall } from './types';

/**
 * Simple fake chat model that cycles through predefined responses
 * and properly formats them for LangChain agent compatibility
 */
export class SimpleFakeChatModel extends FakeChatModel {
	private responseManager: ResponseManager;
	callbacks: BaseCallbackHandler[];

	constructor(callbacks?: BaseCallbackHandler[]) {
		super({});
		this.responseManager = ResponseManager.getInstance();
		this.callbacks = callbacks ?? [];
		// Set required LangChain properties for tool calling compatibility
		this.lc_namespace = ['chat_models'];
	}

	/**
	 * Main invoke method that returns properly formatted responses
	 */
	async invoke(
		messages: BaseLanguageModelInput,
		_options?: FakeListChatModelCallOptions,
	): Promise<AIMessageChunk> {
		// Trigger callback handlers for tracing
		const runId = Math.random().toString(36).substring(7);
		await this.handleCallbackStart(messages, runId);

		// Get next response from the cycle
		const responseItem = this.responseManager.getNextResponse();
		const aiMessage = this.formatResponse(responseItem);

		// Trigger callback end
		await this.handleCallbackEnd(aiMessage, runId);

		// Convert to AIMessageChunk for compatibility
		return new AIMessageChunk({
			content: aiMessage.content,
			tool_calls: aiMessage.tool_calls,
			additional_kwargs: aiMessage.additional_kwargs,
		});
	}

	/**
	 * Format response item into proper AIMessage format
	 */
	private formatResponse(responseItem: FakeResponseItem): AIMessage {
		if (typeof responseItem === 'string') {
			return new AIMessage({
				content: responseItem,
			});
		}

		const response = responseItem as SimpleFakeResponse;
		const content = response.content || '';
		const toolCalls = this.formatToolCalls(response.toolCalls || []);

		const messageData: any = {
			content,
		};

		// Only add tool calls if there are actually tool calls
		if (toolCalls.length > 0) {
			messageData.tool_calls = toolCalls;
			messageData.additional_kwargs = {
				tool_calls: toolCalls,
			};
		}

		return new AIMessage(messageData);
	}

	/**
	 * Format tool calls to match LangChain's expected structure
	 */
	private formatToolCalls(toolCalls: ToolCall[]) {
		return toolCalls.map((toolCall, index) => ({
			id: toolCall.id || `call_${Date.now()}_${index}`,
			name: toolCall.name,
			args: toolCall.args,
			type: 'function' as const,
			function: {
				name: toolCall.name,
				arguments: JSON.stringify(toolCall.args),
			},
		}));
	}

	/**
	 * Handle callback start for tracing
	 */
	private async handleCallbackStart(
		messages: BaseLanguageModelInput,
		runId: string,
	): Promise<void> {
		if (!this.callbacks.length) return;

		const promptStrings = this.convertPromptToStrings(messages);

		for (const callback of this.callbacks) {
			if (typeof callback.handleLLMStart === 'function') {
				try {
					await callback.handleLLMStart(
						{ type: 'constructor', kwargs: {}, lc: 0, id: [''] },
						promptStrings,
						runId,
					);
				} catch (error) {
					console.warn('Error in handleLLMStart:', error);
				}
			}
		}
	}

	/**
	 * Handle callback end for tracing
	 */
	private async handleCallbackEnd(response: AIMessage, runId: string): Promise<void> {
		if (!this.callbacks.length) return;

		for (const callback of this.callbacks) {
			if (typeof callback.handleLLMEnd === 'function') {
				try {
					await callback.handleLLMEnd(
						{
							generations: [[{ text: (response.content as string) || '', generationInfo: {} }]],
							llmOutput: {},
						},
						runId,
					);
				} catch (error) {
					console.warn('Error in handleLLMEnd:', error);
				}
			}
		}
	}

	/**
	 * Convert various message inputs to string array for callbacks
	 */
	private convertPromptToStrings(messages: BaseLanguageModelInput): string[] {
		if (Array.isArray(messages)) {
			return messages.map((msg) => {
				if (typeof msg === 'string') return msg;
				if (msg && typeof (msg as any).content === 'string') return (msg as any).content;
				return String(msg);
			});
		}

		if (typeof messages === 'string') return [messages];
		if (messages && typeof (messages as any).content === 'string')
			return [(messages as any).content];
		return [String(messages)];
	}

	/**
	 * Minimal bindTools implementation - not actually used but required for Agent compatibility
	 */
	bindTools(_tools: any[], _options?: any): any {
		return this;
	}
}
