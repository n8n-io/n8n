import type { Message } from './message';

export interface ChatHistory {
	getMessages(): Promise<Message[]>;
	addMessage(message: Message): Promise<void>;
	addMessages(messages: Message[]): Promise<void>;
	clear(): Promise<void>;
}

export interface ChatMemory {
	loadMessages(): Promise<Message[]>;
	saveTurn(input: string, output: string): Promise<void>;
	clear(): Promise<void>;
	readonly chatHistory: ChatHistory;
}
