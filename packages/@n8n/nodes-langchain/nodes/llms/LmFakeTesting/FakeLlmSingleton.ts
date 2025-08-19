import { FakeChatModel, FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { FakeLlmConfig, FakeLlmResponse } from './types';
import { SequentialFakeStreamingChatModel } from './SequentialFakeStreamingChatModel';

/**
 * Singleton service to manage FakeLLM instances for testing.
 *
 * Provides a centralized way to configure and retrieve fake LLM instances
 * that can be shared across different test scenarios. Supports both fixed
 * and sequential response modes, with proper tool calling integration.
 */
export class FakeLlmSingleton {
	private static instance: FakeLlmSingleton;

	private fakeLlmInstance: FakeStreamingChatModel | FakeChatModel | null = null;

	private currentConfig: FakeLlmConfig | undefined;

	private defaultConfig: FakeLlmConfig = {
		responseType: 'fixed',
		responses: ['This is a fake response'],
		shouldThrowError: false,
		toolStyle: 'none',
	};

	private constructor() {}

	static getInstance(): FakeLlmSingleton {
		if (!FakeLlmSingleton.instance) {
			FakeLlmSingleton.instance = new FakeLlmSingleton();
		}
		return FakeLlmSingleton.instance;
	}

	/**
	 * Configure the fake LLM instance with the provided settings
	 */
	configure(config: Partial<FakeLlmConfig>, callbacks?: any[]): void {
		const newConfig = { ...this.defaultConfig, ...this.currentConfig, ...config };

		// Only recreate if configuration actually changed
		if (!this.currentConfig || JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig)) {
			this.currentConfig = newConfig;
			this.recreateLlmInstance(callbacks);
		}
	}

	/**
	 * Get the configured fake LLM instance
	 */
	getFakeLlm(): FakeChatModel | FakeStreamingChatModel | null {
		if (!this.fakeLlmInstance) {
			this.recreateLlmInstance();
		}
		return this.fakeLlmInstance;
	}

	/**
	 * Get the current configuration
	 */
	getCurrentConfig(): FakeLlmConfig {
		if (!this.currentConfig) {
			return { ...this.defaultConfig };
		}

		return { ...this.currentConfig };
	}

	/**
	 * Reset to default configuration
	 */
	reset(callbacks?: any[]): void {
		this.currentConfig = {
			responseType: 'fixed',
			responses: ['This is a fake response'],
			shouldThrowError: false,
			toolStyle: 'none',
		};
		this.recreateLlmInstance(callbacks);
	}

	/**
	 * Reset the response index for sequential responses
	 */
	resetResponseIndex(): void {
		// Reset is handled by recreating the instance
		// The simple ResponseManager doesn't need explicit reset
	}

	private recreateLlmInstance(callbacks?: any[]): void {
		if (!this.currentConfig) {
			throw new Error('No current configuration found');
		}

		const { responseType, responses, errorMessage, shouldThrowError } = this.currentConfig;

		if (shouldThrowError) {
			// Create a FakeChatModel that throws errors
			this.fakeLlmInstance = new FakeChatModel({
				callbacks: callbacks || [],
			});

			// Override the _generate method to throw an error
			this.fakeLlmInstance._generate = async () => {
				throw new Error(errorMessage || 'Fake LLM error for testing');
			};
		} else {
			const normalizedResponses = this.normalizeResponses(responses || ['This is a fake response']);

			if (responseType === 'sequence') {
				// Use custom sequential wrapper for cycling through responses
				const chunks = normalizedResponses.map(
					(msg) =>
						new AIMessageChunk({
							content: msg.content as string,
							tool_calls: msg.tool_calls || [],
							additional_kwargs: msg.additional_kwargs || {},
						}),
				);
				this.fakeLlmInstance = new SequentialFakeStreamingChatModel(chunks, callbacks);
			} else {
				// For fixed responses, use first response only
				const firstResponse = normalizedResponses[0];
				this.fakeLlmInstance = new FakeStreamingChatModel({
					chunks: [
						new AIMessageChunk({
							content: firstResponse.content as string,
							tool_calls: firstResponse.tool_calls || [],
							additional_kwargs: firstResponse.additional_kwargs || {},
						}),
					],
					callbacks: callbacks || [],
				});
			}
		}
	}

	/**
	 * Normalize responses to handle both string and structured responses with tool calls
	 */
	private normalizeResponses(responses: Array<string | FakeLlmResponse>): AIMessage[] {
		return responses.map((response, index) => {
			if (typeof response === 'string') {
				return new AIMessage({ content: response });
			} else {
				// Handle structured response with potential tool calls
				const content = response.content || '';
				const toolCalls =
					response.toolCalls?.map((toolCall, toolIndex) => ({
						name: toolCall.name,
						args: toolCall.args,
						id: toolCall.id || `call_${Date.now()}_${index}_${toolIndex}`,
						type: 'function' as const,
						function: {
							name: toolCall.name,
							arguments: JSON.stringify(toolCall.args),
						},
					})) || [];

				const message = new AIMessage({
					content,
					additional_kwargs:
						toolCalls.length > 0
							? {
									tool_calls: toolCalls,
								}
							: {},
				});

				// Set tool_calls property if there are tool calls
				if (toolCalls.length > 0) {
					(message as any).tool_calls = toolCalls;
				}

				return message;
			}
		});
	}
}
