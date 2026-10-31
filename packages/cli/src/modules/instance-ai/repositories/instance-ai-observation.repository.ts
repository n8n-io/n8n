import {
	activeLifecycleState,
	prepareObservationLogBatchCursor,
	type ObservationCursor,
	type ObservationLogBatch,
	type ObservationLogBatchCommitResult,
	type ObservationLogReadOptions,
} from '@n8n/agents';
import {
	BaseRepository,
	TransactionRunner,
	isUniqueConstraintError,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, type FindOptionsWhere } from '@n8n/typeorm';

import { InstanceAiObservationCursor } from '../entities/instance-ai-observation-cursor.entity';
import { InstanceAiObservation } from '../entities/instance-ai-observation.entity';

class ObservationCursorInsertConflict extends Error {}

type ObservationLifecycle = Pick<InstanceAiObservation, 'status' | 'supersededBy'>;
type NewObservationRow = Pick<
	InstanceAiObservation,
	'observationScopeId' | 'marker' | 'text' | 'parentId' | 'tokenCount'
> &
	ObservationLifecycle & { createdAt?: Date };

class InstanceAiObservationTable extends BaseRepository<InstanceAiObservation> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiObservation, dataSource.manager, transactionRunner);
	}
}

@Service()
export class InstanceAiObservationRepository {
	private readonly table: InstanceAiObservationTable;

	constructor(
		dataSource: DataSource,
		private readonly transactionRunner: TransactionRunner,
	) {
		this.table = new InstanceAiObservationTable(dataSource, transactionRunner);
	}

	async commitObservationLogBatch(
		batch: ObservationLogBatch,
		ctx: OperationContext,
	): Promise<ObservationLogBatchCommitResult> {
		const cursor = prepareObservationLogBatchCursor(batch);
		if (!cursor) return 'stale';
		try {
			return await this.transactionRunner.run(ctx, async (ctx) => {
				if (!(await this.claimObservationCursor(batch.expectedCursor, cursor, ctx))) {
					return 'stale';
				}
				await this.insertObservationBatch(batch, ctx);
				return 'committed';
			});
		} catch (error) {
			if (error instanceof ObservationCursorInsertConflict) return 'stale';
			throw error;
		}
	}

	private async claimObservationCursor(
		expected: ObservationCursor | null,
		cursor: ObservationCursor,
		ctx: OperationContext,
	): Promise<boolean> {
		const manager = this.table.managerFor(ctx);
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
		batch: ObservationLogBatch,
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.table.managerFor(ctx);
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
	async findActiveForThread(
		threadId: string,
		ctx: OperationContext,
	): Promise<InstanceAiObservation[]> {
		return await this.table.managerFor(ctx).find(InstanceAiObservation, {
			where: { observationScopeId: threadId, status: 'active' },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async appendLogEntries(
		rows: NewObservationRow[],
		ctx: OperationContext,
	): Promise<InstanceAiObservation[]> {
		const manager = this.table.managerFor(ctx);
		const entities = rows.map((row) => manager.create(InstanceAiObservation, row));
		return await manager.save(InstanceAiObservation, entities);
	}

	async findLogEntries(
		opts: ObservationLogReadOptions,
		ctx: OperationContext,
	): Promise<InstanceAiObservation[]> {
		const baseWhere: FindOptionsWhere<InstanceAiObservation> = {
			observationScopeId: opts.observationScopeId,
			...(opts.status !== undefined && { status: opts.status }),
			...(opts.parentId !== undefined && { parentId: opts.parentId ?? IsNull() }),
		};
		return await this.table.managerFor(ctx).find(InstanceAiObservation, {
			where: [baseWhere],
			order: {
				createdAt: opts.order === 'desc' ? 'DESC' : 'ASC',
				id: opts.order === 'desc' ? 'DESC' : 'ASC',
			},
			...(opts.limit !== undefined && { take: opts.limit }),
		});
	}

	async updateLifecycleForEntries(
		ids: string[],
		lifecycle: ObservationLifecycle,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).update(InstanceAiObservation, { id: In(ids) }, lifecycle);
	}

	async updateLifecycleForScopeEntries(
		observationScopeId: string,
		ids: string[],
		lifecycle: ObservationLifecycle,
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.update(InstanceAiObservation, { observationScopeId, id: In(ids) }, lifecycle);
	}
}
