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
			order: { createdAt: 'DESC' },
		});
	}

	async findByIdAndAgentId(fileId: string, agentId: string): Promise<AgentFile | null> {
		return await this.findOne({ where: { id: fileId, agentId } });
	}
}
