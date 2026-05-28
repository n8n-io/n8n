import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublicationOutbox } from '../entities/workflow-publication-outbox';

@Service()
export class WorkflowPublicationOutboxRepository extends Repository<WorkflowPublicationOutbox> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(WorkflowPublicationOutbox, dataSource.manager);
	}

	/**
	 * Atomically claim the oldest pending record by transitioning its status
	 * to `in_progress`. On Postgres uses `FOR UPDATE SKIP LOCKED` so concurrent
	 * consumers never receive the same record. On SQLite (single-process) a
	 * plain `findOne` + `update` is sufficient.
	 *
	 * Returns the claimed record, or `null` when nothing is pending.
	 */
	async claimNextPendingRecord(): Promise<WorkflowPublicationOutbox | null> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.claimWithPostgresLocking();
		}

		return await this.claimWithSimpleUpdate();
	}

	private async claimWithPostgresLocking(): Promise<WorkflowPublicationOutbox | null> {
		const tableName = this.metadata.tableName;

		const result: WorkflowPublicationOutbox[] = await this.query(
			`UPDATE "${tableName}"
			 SET "status" = 'in_progress', "updatedAt" = NOW()
			 WHERE "id" = (
				 SELECT "id" FROM "${tableName}"
				 WHERE "status" = 'pending'
				 ORDER BY "id" ASC
				 LIMIT 1
				 FOR UPDATE SKIP LOCKED
			 )
			 RETURNING *`,
		);

		return result[0] ?? null;
	}

	private async claimWithSimpleUpdate(): Promise<WorkflowPublicationOutbox | null> {
		const record = await this.findOne({
			where: { status: 'pending' },
			order: { id: 'ASC' },
		});

		if (!record) return null;

		await this.update(record.id, { status: 'in_progress' });
		record.status = 'in_progress';

		return record;
	}

	/** Mark a claimed record as successfully processed. */
	async markCompleted(id: number): Promise<void> {
		await this.update(id, { status: 'completed', errorMessage: null });
	}

	/** Mark a claimed record as failed and record the error for diagnostics. */
	async markFailed(id: number, errorMessage: string): Promise<void> {
		await this.update(id, { status: 'failed', errorMessage });
	}
}
