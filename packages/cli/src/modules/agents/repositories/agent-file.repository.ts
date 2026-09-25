import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentFile } from '../entities/agent-file.entity';

@Service()
export class AgentFileRepository extends Repository<AgentFile> {
	constructor(dataSource: DataSource) {
		super(AgentFile, dataSource.manager);
	}

	async findByAgentId(agentId: string): Promise<AgentFile[]> {
		return await this.find({
			where: { agentId },
			// Secondary id sort keeps pagination stable when batch uploads
			// share the same createdAt timestamp.
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async hasFilesForAgent(agentId: string): Promise<boolean> {
		return await this.existsBy({ agentId });
	}

	async findByIdAndAgentId(fileId: string, agentId: string): Promise<AgentFile | null> {
		return await this.findOneBy({ id: fileId, agentId });
	}
}
