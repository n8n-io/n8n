import type { ChatHistory, ChatMemory } from '../types/memory';
import type { Message } from '../types/message';

export abstract class BaseChatMemory implements ChatMemory {
	abstract readonly chatHistory: ChatHistory;

	abstract loadMessages(): Promise<Message[]>;

	abstract saveTurn(input: string, output: string): Promise<void>;

	abstract clear(): Promise<void>;
}
