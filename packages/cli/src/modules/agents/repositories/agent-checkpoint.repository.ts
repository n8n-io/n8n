import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';

@Service()
export class AgentCheckpointRepository extends Repository<AgentCheckpoint> {
	constructor(dataSource: DataSource) {
		super(AgentCheckpoint, dataSource.manager);
	}

	async markExpired(olderThan: Date): Promise<number> {
		const result = await this.createQueryBuilder()
			.update()
			.set({ expired: true, state: null })
			.where('updatedAt < :olderThan', { olderThan })
			.andWhere('expired = :expired', { expired: false })
			.execute();

		return result.affected ?? 0;
	}
}
