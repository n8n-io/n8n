import { BaseChatMemory } from './base-chat-memory';
import type { ChatHistory } from '../types/memory';
import type { Message } from '../types/message';

export interface WindowedChatMemoryConfig {
	windowSize?: number;
}

/** Keeps only the last N message pairs in context. */
export class WindowedChatMemory extends BaseChatMemory {
	readonly chatHistory: ChatHistory;
	private readonly windowSize: number;

	constructor(chatHistory: ChatHistory, config?: WindowedChatMemoryConfig) {
		super();
		this.chatHistory = chatHistory;
		this.windowSize = config?.windowSize ?? 10;
	}

	async loadMessages(): Promise<Message[]> {
		const allMessages = await this.chatHistory.getMessages();

		if (allMessages.length === 0) {
			return [];
		}

		const maxMessages = this.windowSize * 2;

		if (allMessages.length <= maxMessages) {
			return allMessages;
		}

		return allMessages.slice(-maxMessages);
	}

	async saveTurn(input: string, output: string): Promise<void> {
		const humanMessage: Message = {
			role: 'user',
			content: [{ type: 'text', text: input }],
		};

		const aiMessage: Message = {
			role: 'assistant',
			content: [{ type: 'text', text: output }],
		};

		await this.chatHistory.addMessages([humanMessage, aiMessage]);
	}

	async clear(): Promise<void> {
		await this.chatHistory.clear();
	}
}
