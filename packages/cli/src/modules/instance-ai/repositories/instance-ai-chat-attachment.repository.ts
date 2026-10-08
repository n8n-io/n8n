import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { InstanceAiChatAttachment } from '../entities/instance-ai-chat-attachment.entity';

@Service()
export class InstanceAiChatAttachmentRepository extends Repository<InstanceAiChatAttachment> {
	constructor(dataSource: DataSource) {
		super(InstanceAiChatAttachment, dataSource.manager);
	}

	async findByIdInThread(id: string, threadId: string): Promise<InstanceAiChatAttachment | null> {
		return await this.findOneBy({ id, threadId });
	}

	async findByThread(threadId: string): Promise<InstanceAiChatAttachment[]> {
		return await this.findBy({ threadId });
	}

	async findNewestFirstByThread(threadId: string): Promise<InstanceAiChatAttachment[]> {
		return await this.find({
			where: { threadId },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
	}

	async findByThreadIds(threadIds: string[]): Promise<InstanceAiChatAttachment[]> {
		if (threadIds.length === 0) return [];
		return await this.findBy({ threadId: In(threadIds) });
	}

	async sumFileSizeBytesByThread(threadId: string): Promise<number> {
		const raw = await this.createQueryBuilder('attachment')
			.select('COALESCE(SUM(attachment.fileSizeBytes), 0)', 'total')
			.where('attachment.threadId = :threadId', { threadId })
			.getRawOne<{ total: string | number }>();
		return Number(raw?.total ?? 0);
	}
}
