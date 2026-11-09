import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';

@Service()
export class AgentMemoryEntrySourceRepository extends Repository<AgentMemoryEntrySourceEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntrySourceEntity, dataSource.manager);
	}

	/** Oldest first. */
	async findByEntryIds(
		agentId: string,
		entryIds: string[],
	): Promise<AgentMemoryEntrySourceEntity[]> {
		if (entryIds.length === 0) return [];
		return await this.find({
			where: { agentId, memoryEntryId: In(entryIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	/** Oldest first. */
	async findByCandidateIds(
		agentId: string,
		candidateIds: string[],
	): Promise<AgentMemoryEntrySourceEntity[]> {
		if (candidateIds.length === 0) return [];
		return await this.find({
			where: { agentId, candidateId: In(candidateIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}
}
