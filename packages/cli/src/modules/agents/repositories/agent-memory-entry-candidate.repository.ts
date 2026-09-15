import type { EpisodicMemoryCaptureKind } from '@n8n/agents';
import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';

interface EnqueueCandidateInput {
	agentId: string;
	resourceId: string;
	threadId: string;
	sourceMessageId: string | null;
	runId: string;
	toolCallId: string;
	content: string;
	evidenceText: string;
	kind: EpisodicMemoryCaptureKind;
}

@Service()
export class AgentMemoryEntryCandidateRepository extends Repository<AgentMemoryEntryCandidateEntity> {
	constructor(dataSource: DataSource) {
		super(AgentMemoryEntryCandidateEntity, dataSource.manager);
	}

	async enqueueCandidate(input: EnqueueCandidateInput): Promise<AgentMemoryEntryCandidateEntity> {
		const existing = await this.findOneBy({
			agentId: input.agentId,
			runId: input.runId,
			toolCallId: input.toolCallId,
		});
		if (existing) return existing;

		try {
			return await this.save(this.create({ ...input, status: 'pending', attemptCount: 0 }));
		} catch (error) {
			const concurrentlyInserted = await this.findOneBy({
				agentId: input.agentId,
				runId: input.runId,
				toolCallId: input.toolCallId,
			});
			if (concurrentlyInserted) return concurrentlyInserted;
			throw error;
		}
	}

	async findPendingForResource(
		agentId: string,
		resourceId: string,
		limit: number,
	): Promise<AgentMemoryEntryCandidateEntity[]> {
		return await this.find({
			where: { agentId, resourceId, status: 'pending' },
			order: { createdAt: 'ASC', id: 'ASC' },
			take: limit,
		});
	}

	async markCandidatesCompleted(agentId: string, ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await this.update({ agentId, id: In(ids), status: 'pending' }, { status: 'completed' });
	}

	async recordCandidateFailure(agentId: string, ids: string[], maxAttempts: number): Promise<void> {
		if (ids.length === 0) return;
		await this.createQueryBuilder()
			.update(AgentMemoryEntryCandidateEntity)
			.set({
				attemptCount: () => '"attemptCount" + 1',
				status: () =>
					"CASE WHEN \"attemptCount\" + 1 >= :maxAttempts THEN 'failed' ELSE 'pending' END",
			})
			.where('"agentId" = :agentId', { agentId })
			.andWhere('"id" IN (:...ids)', { ids })
			.andWhere('"status" = \'pending\'')
			.setParameter('maxAttempts', maxAttempts)
			.execute();
	}
}
