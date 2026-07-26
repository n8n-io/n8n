import type { ChatHistory } from '../types/memory';
import type { Message } from '../types/message';

export abstract class BaseChatHistory implements ChatHistory {
	abstract getMessages(): Promise<Message[]>;

	abstract addMessage(message: Message): Promise<void>;

	async addMessages(messages: Message[]): Promise<void> {
		for (const msg of messages) {
			await this.addMessage(msg);
		}
	}

	abstract clear(): Promise<void>;
}
