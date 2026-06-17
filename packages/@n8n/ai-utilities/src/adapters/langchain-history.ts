import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseMessage } from '@langchain/core/messages';

import { fromLcMessage, toLcMessage } from '../converters/message';
import type { ChatHistory } from '../types/memory';

export class LangchainHistoryAdapter extends BaseListChatMessageHistory {
	lc_namespace = ['n8n', 'ai-utilities'];

	constructor(private readonly history: ChatHistory) {
		super();
	}

	async getMessages(): Promise<BaseMessage[]> {
		const messages = await this.history.getMessages();
		return messages.map(toLcMessage);
	}

	async addMessage(message: BaseMessage): Promise<void> {
		await this.history.addMessage(fromLcMessage(message));
	}

	async addMessages(messages: BaseMessage[]): Promise<void> {
		await this.history.addMessages(messages.map(fromLcMessage));
	}

	async clear(): Promise<void> {
		await this.history.clear();
	}
}
