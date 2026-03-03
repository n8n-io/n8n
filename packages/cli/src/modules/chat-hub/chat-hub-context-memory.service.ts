import { Logger } from '@n8n/backend-common';
import { ChatHubConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { parseMessage } from '@n8n/chat-hub';

import { ChatHubContextMemoryItemRepository } from './chat-hub-context-memory-item.repository';

@Service()
export class ChatHubContextMemoryService {
	constructor(
		private readonly logger: Logger,
		private readonly memoryRepository: ChatHubContextMemoryItemRepository,
		private readonly chatHubConfig: ChatHubConfig,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async getMemoryItems(userId: string): Promise<Array<{ item: string; sessionId: string }>> {
		const items = await this.memoryRepository.getAllByUserId(userId);
		return items.map(({ item, sessionId }) => ({ item, sessionId }));
	}

	async addMemoryItem(
		userId: string,
		sessionId: string,
		messageId: string,
		item: string,
	): Promise<void> {
		const count = await this.memoryRepository.countBy({ userId });
		if (count >= this.chatHubConfig.maxMemoryEntries) return;
		await this.memoryRepository.insert({ userId, sessionId, messageId, item });
	}

	async deleteMemoryItemByIndex(userId: string, index: number): Promise<void> {
		const items = await this.memoryRepository.getAllByUserId(userId);
		const memoryItem = items[index];
		if (memoryItem) {
			await this.memoryRepository.delete(memoryItem.id);
		}
	}

	async clearMemory(userId: string): Promise<void> {
		await this.memoryRepository.deleteAllByUserId(userId);
	}

	/**
	 * Parse AI message content for memory commands and save/update items
	 */
	async extractAndSaveMemoryItems(
		userId: string,
		sessionId: string,
		messageId: string,
		content: string,
	): Promise<void> {
		const chunks = parseMessage({ type: 'ai', content });
		for (const chunk of chunks) {
			if (chunk.type === 'memory-create' && !chunk.isIncomplete && chunk.item) {
				try {
					await this.addMemoryItem(userId, sessionId, messageId, chunk.item);
				} catch (error) {
					this.logger.warn('Failed to save memory item', {
						cause: error instanceof Error ? error.message : String(error),
					});
				}
			} else if (chunk.type === 'memory-edit' && !chunk.isIncomplete && chunk.item) {
				try {
					if (chunk.index > 0) {
						await this.deleteMemoryItemByIndex(userId, chunk.index - 1);
					}
					await this.addMemoryItem(userId, sessionId, messageId, chunk.item);
				} catch (error) {
					this.logger.warn('Failed to update memory item', {
						cause: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}
}
