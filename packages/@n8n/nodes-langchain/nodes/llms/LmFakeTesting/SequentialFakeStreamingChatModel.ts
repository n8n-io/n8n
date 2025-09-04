import type { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { AIMessageChunk } from '@langchain/core/messages';
import { FakeChatModel, type FakeListChatModelCallOptions } from '@langchain/core/utils/testing';

function convertPromptStrings(prompts: any) {
	let promptStrings: string[];

	if (Array.isArray(prompts)) {
		// Handle array of messages or strings
		promptStrings = prompts.map((prompt) => {
			if (typeof prompt === 'string') {
				return prompt;
			} else if (prompt && typeof prompt.content === 'string') {
				// Handle BaseMessage objects
				return prompt.content;
			} else if (prompt && typeof prompt.toString === 'function') {
				return prompt.toString();
			} else {
				return String(prompt);
			}
		});
	} else if (typeof prompts === 'string') {
		promptStrings = [prompts];
	} else if (prompts && typeof prompts.content === 'string') {
		// Single BaseMessage object
		promptStrings = [prompts.content];
	} else {
		// Fallback
		promptStrings = [String(prompts)];
	}

	return promptStrings;
}
/**
 * Clean FakeStreamingChatModel that handles sequential responses
 *
 * Extends LangChain's FakeStreamingChatModel to support cycling through
 * multiple responses in sequence.
 *
 */
export class SequentialFakeStreamingChatModel extends FakeChatModel {
	private responses: AIMessageChunk[];
	private shouldLoop: boolean;
	callbacks: BaseCallbackHandler[];

	constructor(
		responses: AIMessageChunk[],
		callbacks?: BaseCallbackHandler[],
		shouldLoop?: boolean,
	) {
		super({});
		this.callbacks = callbacks ?? [];
		this.responses = [...responses];
		this.shouldLoop = shouldLoop ?? false;
	}

	/**
	 * Get the next response in the sequence
	 * Returns fallback messages when no responses are available or configured
	 */
	private getNextResponse(): AIMessageChunk {
		// Check if we started with empty responses

		const response = this.responses.shift();
		if (!response) {
			// Handle when all responses are exhausted
			return { content: 'No more responses available' } as AIMessageChunk;
		}

		if (this.shouldLoop) {
			this.responses.push(response);
		}

		return response;
	}

	async invoke(
		messages: BaseLanguageModelInput,
		_options?: FakeListChatModelCallOptions,
	): Promise<AIMessageChunk> {
		// trigger callback handlers manually for proper tracing
		const runId = Math.random().toString(36).substring(7);

		// simulate handleLLMStart
		if (this.callbacks) {
			for (const currentCallback of this.callbacks) {
				if (typeof currentCallback.handleLLMStart === 'function') {
					try {
						// convert messages to string array format expected by handlellmstart
						const convertedMessages = convertPromptStrings(messages);

						await currentCallback.handleLLMStart(
							{ type: 'constructor', kwargs: {}, lc: 0, id: [''] },
							convertedMessages,
							runId,
						);
					} catch (error) {
						console.warn('error in handleLLMStart:', error);
					}
				}
			}
		}

		// get the response
		const response = this.getNextResponse();

		// simulate handleLLMEnd
		if (this.callbacks) {
			for (const currentCallback of this.callbacks) {
				if (typeof currentCallback.handleLLMEnd === 'function') {
					try {
						await currentCallback.handleLLMEnd(
							{
								generations: [[{ text: (response.content as string) || '', generationInfo: {} }]],
								llmOutput: {},
							},
							runId,
						);
					} catch (error) {
						console.warn('error in handleLLMEnd:', error);
					}
				}
			}
		}

		return response;
	}

	bindTools(_tools: any[], _options?: any): any {
		return this;
	}
}
