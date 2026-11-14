import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { InstanceAiObservationCursor } from '../entities/instance-ai-observation-cursor.entity';

class InstanceAiObservationCursorTable extends BaseRepository<InstanceAiObservationCursor> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiObservationCursor, dataSource.manager, transactionRunner);
	}
}

@Service()
export class InstanceAiObservationCursorRepository {
	private readonly table: InstanceAiObservationCursorTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new InstanceAiObservationCursorTable(dataSource, transactionRunner);
	}

	/** Observational memory is thread-scoped, so the scope id is the thread id.
	 *  Null means the observer never ran for this thread. */
	async findForThread(
		threadId: string,
		ctx: OperationContext,
	): Promise<InstanceAiObservationCursor | null> {
		return await this.table
			.managerFor(ctx)
			.findOneBy(InstanceAiObservationCursor, { observationScopeId: threadId });
	}

	async upsertForThread(
		cursor: Pick<
			InstanceAiObservationCursor,
			'observationScopeId' | 'lastObservedMessageId' | 'lastObservedAt' | 'updatedAt'
		>,
		ctx: OperationContext,
	): Promise<void> {
		await this.table.managerFor(ctx).upsert(InstanceAiObservationCursor, cursor, {
			conflictPaths: ['observationScopeId'],
			skipUpdateIfNoValuesChanged: false,
		});
	}
}
