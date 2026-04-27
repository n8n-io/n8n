import { Service } from '@n8n/di';

import type { IV0Client, V0ChatResult } from './v0-client.interface';

@Service()
export class FakeV0Client implements IV0Client {
	private chats = new Map<string, V0ChatResult>();
	private counter = 0;

	async create({ message }: { message: string }): Promise<V0ChatResult> {
		this.counter += 1;
		const chatId = `fake-chat-${this.counter}`;
		const result: V0ChatResult = {
			chatId,
			demoUrl: `https://example.invalid/fake-demo/${chatId}`,
			messages: [
				{ role: 'user', content: message, createdAt: new Date().toISOString() },
				{
					role: 'assistant',
					content: `(fake) Generated a frontend for prompt: ${message.slice(0, 80)}`,
					createdAt: new Date().toISOString(),
				},
			],
		};
		this.chats.set(chatId, result);
		return result;
	}

	async sendMessage({
		chatId,
		message,
	}: {
		chatId: string;
		message: string;
	}): Promise<V0ChatResult> {
		// The fake's chat map is in-memory and resets on cli restart, but
		// `chatId` survives in workflow.staticData. Be lenient: if we don't
		// know this chatId, treat it as a fresh conversation under that id.
		const prev = this.chats.get(chatId) ?? this.makeEmpty(chatId);
		const updated: V0ChatResult = {
			chatId,
			demoUrl: `${prev.demoUrl}?v=${prev.messages.length + 2}`,
			messages: [
				...prev.messages,
				{ role: 'user', content: message, createdAt: new Date().toISOString() },
				{
					role: 'assistant',
					content: `(fake follow-up) ${message.slice(0, 80)}`,
					createdAt: new Date().toISOString(),
				},
			],
		};
		this.chats.set(chatId, updated);
		return updated;
	}

	async getChat(chatId: string): Promise<V0ChatResult> {
		return this.chats.get(chatId) ?? this.makeEmpty(chatId);
	}

	private makeEmpty(chatId: string): V0ChatResult {
		return {
			chatId,
			demoUrl: `https://example.invalid/fake-demo/${chatId}`,
			messages: [],
		};
	}
}
