import {
	activeLifecycleState,
	prepareObservationLogBatchCursor,
	type ObservationCursor,
	type ObservationLogBatch,
	type ObservationLogBatchCommitResult,
} from '@n8n/agents';
import { BaseRepository, TransactionRunner, isUniqueConstraintError } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type EntityManager } from '@n8n/typeorm';

import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity';
import { AgentObservationEntity } from '../entities/agent-observation.entity';

class ObservationCursorInsertConflict extends Error {}

@Service()
export class AgentObservationRepository extends BaseRepository<AgentObservationEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentObservationEntity, dataSource.manager, transactionRunner);
	}

	async commitObservationLogBatch(
		agentId: string,
		batch: ObservationLogBatch,
	): Promise<ObservationLogBatchCommitResult> {
		const cursor = prepareObservationLogBatchCursor(batch);
		if (!cursor) return 'stale';
		try {
			return await this.runInTransaction({}, async (manager) => {
				if (!(await this.claimObservationCursor(manager, agentId, batch.expectedCursor, cursor))) {
					return 'stale';
				}
				await this.insertObservationBatch(manager, agentId, batch);
				return 'committed';
			});
		} catch (error) {
			if (error instanceof ObservationCursorInsertConflict) return 'stale';
			throw error;
		}
	}

	private async claimObservationCursor(
		manager: EntityManager,
		agentId: string,
		expected: ObservationCursor | null,
		cursor: ObservationCursor,
	): Promise<boolean> {
		if (expected) {
			const result = await manager.update(
				AgentObservationCursorEntity,
				{ agentId, ...expected },
				cursor,
			);
			return result.affected === 1;
		}
		try {
			await manager.insert(AgentObservationCursorEntity, { agentId, ...cursor });
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new ObservationCursorInsertConflict();
			throw error;
		}
		return true;
	}

	private async insertObservationBatch(
		manager: EntityManager,
		agentId: string,
		batch: ObservationLogBatch,
	): Promise<void> {
		const inserted: AgentObservationEntity[] = [];
		for (const entry of batch.entries) {
			const row = manager.create(AgentObservationEntity, {
				agentId,
				observationScopeId: batch.observationScopeId,
				marker: entry.marker,
				text: entry.text,
				parentId: entry.parentIndex === null ? null : inserted[entry.parentIndex].id,
				tokenCount: entry.tokenCount,
				createdAt: entry.createdAt,
				...activeLifecycleState(),
			});
			inserted.push(await manager.save(AgentObservationEntity, row));
		}
	}
}
