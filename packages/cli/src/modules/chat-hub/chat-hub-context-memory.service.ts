import { Service } from '@n8n/di';

import { ChatHubContextMemoryItemRepository } from './chat-hub-context-memory-item.repository';
import { MAX_MEMORY_ENTRIES } from './chat-hub.constants';

@Service()
export class ChatHubContextMemoryService {
	constructor(private readonly memoryRepository: ChatHubContextMemoryItemRepository) {}

	async getMemoryItems(userId: string): Promise<string[]> {
		const items = await this.memoryRepository.getAllByUserId(userId);
		return items.map(({ item }) => item);
	}

	async addMemoryItem(userId: string, item: string): Promise<void> {
		const count = await this.memoryRepository.countBy({ userId });
		if (count >= MAX_MEMORY_ENTRIES) return;
		await this.memoryRepository.insert({ userId, item });
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
}
