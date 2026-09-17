import { droppedLifecycleState, uniqueStrings } from '@n8n/agents';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, Like } from '@n8n/typeorm';

import { AgentThreadEntity } from '../entities/agent-thread.entity';
import { AgentMemoryEntryCandidateEntity } from '../entities/agent-memory-entry-candidate.entity';
import { AgentMemoryEntrySourceEntity } from '../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../entities/agent-memory-entry.entity';
import { AgentObservationEntity } from '../entities/agent-observation.entity';
import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';

@Service()
export class AgentThreadRepository extends BaseRepository<AgentThreadEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentThreadEntity, dataSource.manager, transactionRunner);
	}

	async deleteWithMemory(
		agentId: string,
		threadId: string,
		ctx: OperationContext,
		prefix = false,
	): Promise<void> {
		await this.runInTransaction(ctx, async (manager) => {
			const scope = prefix ? Like(`${threadId}%`) : threadId;
			const sourceRepository = manager.getRepository(AgentMemoryEntrySourceEntity);
			const sources = await sourceRepository.find({
				select: { memoryEntryId: true },
				where: { agentId, threadId: scope },
			});
			const entryIds = uniqueStrings(sources.map((source) => source.memoryEntryId));
			if (entryIds.length > 0) {
				await sourceRepository.delete({ agentId, threadId: scope });
				const remaining = await sourceRepository.find({
					select: { memoryEntryId: true },
					where: { agentId, memoryEntryId: In(entryIds) },
				});
				const retained = new Set(remaining.map((source) => source.memoryEntryId));
				const orphaned = entryIds.filter((id) => !retained.has(id));
				if (orphaned.length > 0) {
					await manager.update(
						AgentMemoryEntryEntity,
						{ agentId, id: In(orphaned), status: 'active' },
						droppedLifecycleState(),
					);
				}
			}
			await manager.delete(AgentMemoryEntryCandidateEntity, { agentId, threadId: scope });
			const observationScope = { agentId, observationScopeId: scope };
			await manager.delete(AgentObservationEntity, observationScope);
			await manager.delete(AgentObservationCursorEntity, observationScope);
			await manager.delete(AgentObservationLockEntity, observationScope);
			await manager.delete(AgentThreadEntity, { id: scope });
		});
	}
}
