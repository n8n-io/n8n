import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { SdkAgent } from '../entities/sdk-agent.entity';

@Service()
export class SdkAgentRepository extends Repository<SdkAgent> {
	constructor(dataSource: DataSource) {
		super(SdkAgent, dataSource.manager);
	}

	async findByProjectId(projectId: string): Promise<SdkAgent[]> {
		return await this.find({
			where: { projectId },
			order: { updatedAt: 'DESC' },
		});
	}

	async findByIdAndProjectId(id: string, projectId: string): Promise<SdkAgent | null> {
		return await this.findOneBy({ id, projectId });
	}
}
