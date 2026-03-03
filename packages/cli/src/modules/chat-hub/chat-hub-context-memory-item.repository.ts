import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ChatHubContextMemoryItem } from './chat-hub-context-memory-item.entity';

@Service()
export class ChatHubContextMemoryItemRepository extends Repository<ChatHubContextMemoryItem> {
	constructor(dataSource: DataSource) {
		super(ChatHubContextMemoryItem, dataSource.manager);
	}

	async getAllByUserId(userId: string): Promise<ChatHubContextMemoryItem[]> {
		return await this.find({
			where: { userId },
			order: { createdAt: 'ASC' },
		});
	}

	async deleteAllByUserId(userId: string): Promise<void> {
		await this.delete({ userId });
	}
}
