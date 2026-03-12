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
	 * Atomically claim the next pending outbox record by updating its status
	 * to 'in_progress'. Uses FOR UPDATE SKIP LOCKED on Postgres for concurrent
	 * consumers. On SQLite (single-process), uses a simple findOne + update.
	 */
	async claimNextPendingRecord(): Promise<WorkflowPublicationOutbox | null> {
		const dbType = this.globalConfig.database.type;

		if (dbType === 'postgresdb') {
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
}
