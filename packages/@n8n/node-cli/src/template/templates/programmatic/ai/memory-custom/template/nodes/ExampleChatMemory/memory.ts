import { BaseChatHistory, Message } from '@n8n/ai-node-sdk';

/**
 * In-memory chat history storage
 * Stores conversation messages in memory by session ID
 * DO NOT use this in production, in-memory storage is not persistent
 */
export class InMemoryChatHistory extends BaseChatHistory {
	private static storage: Map<string, Message[]> = new Map();

	constructor(private sessionId: string) {
		super();
	}

	async getMessages(): Promise<Message[]> {
		const messages = InMemoryChatHistory.storage.get(this.sessionId);
		return messages ? [...messages] : [];
	}

	async addMessage(message: Message): Promise<void> {
		const messages = InMemoryChatHistory.storage.get(this.sessionId) || [];
		messages.push(message);
		InMemoryChatHistory.storage.set(this.sessionId, messages);
	}

	async clear(): Promise<void> {
		InMemoryChatHistory.storage.delete(this.sessionId);
	}
}
