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

import { InstanceAiObservationCursor } from '../entities/instance-ai-observation-cursor.entity';
import { InstanceAiObservation } from '../entities/instance-ai-observation.entity';

class ObservationCursorInsertConflict extends Error {}

@Service()
export class InstanceAiObservationRepository extends BaseRepository<InstanceAiObservation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiObservation, dataSource.manager, transactionRunner);
	}

	async commitObservationLogBatch(
		batch: ObservationLogBatch,
	): Promise<ObservationLogBatchCommitResult> {
		const cursor = prepareObservationLogBatchCursor(batch);
		if (!cursor) return 'stale';
		try {
			return await this.runInTransaction({}, async (manager) => {
				if (!(await this.claimObservationCursor(manager, batch.expectedCursor, cursor))) {
					return 'stale';
				}
				await this.insertObservationBatch(manager, batch);
				return 'committed';
			});
		} catch (error) {
			if (error instanceof ObservationCursorInsertConflict) return 'stale';
			throw error;
		}
	}

	private async claimObservationCursor(
		manager: EntityManager,
		expected: ObservationCursor | null,
		cursor: ObservationCursor,
	): Promise<boolean> {
		if (expected) {
			const result = await manager.update(InstanceAiObservationCursor, expected, cursor);
			return result.affected === 1;
		}
		try {
			await manager.insert(InstanceAiObservationCursor, cursor);
		} catch (error) {
			if (isUniqueConstraintError(error)) throw new ObservationCursorInsertConflict();
			throw error;
		}
		return true;
	}

	private async insertObservationBatch(
		manager: EntityManager,
		batch: ObservationLogBatch,
	): Promise<void> {
		const inserted: InstanceAiObservation[] = [];
		for (const entry of batch.entries) {
			const row = manager.create(InstanceAiObservation, {
				observationScopeId: batch.observationScopeId,
				marker: entry.marker,
				text: entry.text,
				parentId: entry.parentIndex === null ? null : inserted[entry.parentIndex].id,
				tokenCount: entry.tokenCount,
				createdAt: entry.createdAt,
				...activeLifecycleState(),
			});
			inserted.push(await manager.save(InstanceAiObservation, row));
		}
	}

	/** Live observations for a thread, oldest first. Superseded and dropped rows are
	 *  excluded: they are no longer what the agent remembers. */
	async findActiveForThread(threadId: string): Promise<InstanceAiObservation[]> {
		return await this.find({
			where: { observationScopeId: threadId, status: 'active' },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}
}
