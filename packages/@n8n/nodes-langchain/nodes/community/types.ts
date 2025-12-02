import type { BaseChatMemory } from '@langchain/classic/memory';
import { BufferWindowMemory } from '@langchain/classic/memory';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseMessage } from '@langchain/core/messages';
import {
	AIMessage,
	HumanMessage,
	mapChatMessagesToStoredMessages,
	mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';

export type N8NMemoryOptions = {
	type: 'bufferWindow';
	chatHistory?: N8NBaseChatMessageHistory;
	returnMessages?: boolean;
	inputKey?: string;
	outputKey?: string;
	humanPrefix?: string;
	aiPrefix?: string;
	memoryKey?: string;
	k?: number;
};

export function createN8NMemory(options: N8NMemoryOptions): BaseChatMemory {
	if (options.type === 'bufferWindow') {
		return new BufferWindowMemory({
			chatHistory: options.chatHistory
				? new N8NBaseChatHistoryAdapter({ chatHistory: options.chatHistory })
				: undefined,
			returnMessages: options.returnMessages,
			inputKey: options.inputKey,
			outputKey: options.outputKey,
			humanPrefix: options.humanPrefix,
			aiPrefix: options.aiPrefix,
			memoryKey: options.memoryKey,
			k: options.k,
		});
	}
	throw new Error(`Unsupported memory type: ${options.type}`);
}

export interface N8NStoredMessageData {
	content: string;
	role: string | undefined;
	name: string | undefined;
	tool_call_id: string | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	additional_kwargs?: Record<string, any>;
	/** Response metadata. For example: response headers, logprobs, token counts, model name. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	response_metadata?: Record<string, any>;
	id?: string;
}

export interface N8NStoredMessage {
	type: string;
	data: N8NStoredMessageData;
}

/**
 * Base class for all chat message histories. All chat message histories
 * should extend this class.
 */
export abstract class N8NBaseChatMessageHistory {
	abstract getMessages(): Promise<N8NStoredMessage[]>;
	abstract addMessage(message: N8NStoredMessage): Promise<void>;
	abstract addMessages(messages: N8NStoredMessage[]): Promise<void>;
	abstract clear(): Promise<void>;
	abstract lc_namespace: string[];
}

interface N8NBaseChatHistoryAdapterInput {
	chatHistory: N8NBaseChatMessageHistory;
}

class N8NBaseChatHistoryAdapter extends BaseChatMessageHistory {
	n8nChatHistory: N8NBaseChatMessageHistory;
	lc_namespace: string[];

	constructor({ chatHistory }: N8NBaseChatHistoryAdapterInput) {
		super();
		this.n8nChatHistory = chatHistory;
		this.lc_namespace = chatHistory.lc_namespace;
	}
	async getMessages(): Promise<BaseMessage[]> {
		return mapStoredMessagesToChatMessages(await this.n8nChatHistory.getMessages());
	}
	async addMessage(message: BaseMessage): Promise<void> {
		await this.n8nChatHistory.addMessage(mapChatMessagesToStoredMessages([message])[0]);
	}
	async addUserMessage(message: string): Promise<void> {
		await this.addMessage(new HumanMessage(message));
	}
	async addAIMessage(message: string): Promise<void> {
		await this.addMessage(new AIMessage(message));
	}
	async clear(): Promise<void> {
		await this.n8nChatHistory.clear();
	}
}
