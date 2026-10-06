import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentSessionOutputFile } from '../entities/agent-session-output-file.entity';

@Service()
export class AgentSessionOutputFileRepository extends Repository<AgentSessionOutputFile> {
	constructor(dataSource: DataSource) {
		super(AgentSessionOutputFile, dataSource.manager);
	}

	async findByIdInThread(
		id: string,
		scope: { projectId: string; threadId: string },
	): Promise<AgentSessionOutputFile | null> {
		return await this.findOneBy({ id, projectId: scope.projectId, threadId: scope.threadId });
	}

	async findByThread(
		threadId: string,
		scope: { projectId: string } | { agentId: string },
	): Promise<AgentSessionOutputFile[]> {
		return await this.findBy({ threadId, ...scope });
	}

	async findByThreadAndFileName(
		threadId: string,
		fileName: string,
	): Promise<AgentSessionOutputFile | null> {
		return await this.findOneBy({ threadId, fileName });
	}

	async countByThread(threadId: string, scope: { projectId: string }): Promise<number> {
		return await this.countBy({ threadId, projectId: scope.projectId });
	}

	async sumFileSizeBytesByThread(threadId: string, scope: { projectId: string }): Promise<number> {
		const raw = await this.createQueryBuilder('output')
			.select('COALESCE(SUM(output.fileSizeBytes), 0)', 'total')
			.where('output.threadId = :threadId', { threadId })
			.andWhere('output.projectId = :projectId', { projectId: scope.projectId })
			.getRawOne<{ total: string | number }>();
		return Number(raw?.total ?? 0);
	}
}
