import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { InstanceAiSessionOutputFile } from '../entities/instance-ai-session-output-file.entity';

@Service()
export class InstanceAiSessionOutputFileRepository extends Repository<InstanceAiSessionOutputFile> {
	constructor(dataSource: DataSource) {
		super(InstanceAiSessionOutputFile, dataSource.manager);
	}

	async findByIdInThread(
		id: string,
		threadId: string,
	): Promise<InstanceAiSessionOutputFile | null> {
		return await this.findOneBy({ id, threadId });
	}

	async findByThread(threadId: string): Promise<InstanceAiSessionOutputFile[]> {
		return await this.findBy({ threadId });
	}

	async findByThreadIds(threadIds: string[]): Promise<InstanceAiSessionOutputFile[]> {
		if (threadIds.length === 0) return [];
		return await this.findBy({ threadId: In(threadIds) });
	}

	async findByThreadAndFileName(
		threadId: string,
		fileName: string,
	): Promise<InstanceAiSessionOutputFile | null> {
		return await this.findOneBy({ threadId, fileName });
	}

	async countByThread(threadId: string): Promise<number> {
		return await this.countBy({ threadId });
	}

	async sumFileSizeBytesByThread(threadId: string): Promise<number> {
		const raw = await this.createQueryBuilder('output')
			.select('COALESCE(SUM(output.fileSizeBytes), 0)', 'total')
			.where('output.threadId = :threadId', { threadId })
			.getRawOne<{ total: string | number }>();
		return Number(raw?.total ?? 0);
	}
}
