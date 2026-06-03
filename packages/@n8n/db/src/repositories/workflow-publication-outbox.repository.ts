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
	 * Enqueue a publication for `workflowId`. If a pending record is already in
	 * place for the same workflow, its `publishedVersionId` is updated in place,
	 * superseding the previous requested version.
	 *
	 * A single atomic UPSERT on the partial unique index
	 * (`workflowId` where `status = 'pending'`) guarantees at most one pending
	 * record per workflow without an explicit transaction. Callers only need to
	 * know the enqueue succeeded, so no row is returned.
	 */
	async enqueue(workflowId: string, publishedVersionId: string): Promise<void> {
		if (this.globalConfig.database.type === 'postgresdb') {
			await this.enqueueWithPostgresUpsert(workflowId, publishedVersionId);
			return;
		}

		await this.enqueueWithSqliteUpsert(workflowId, publishedVersionId);
	}

	private async enqueueWithPostgresUpsert(
		workflowId: string,
		publishedVersionId: string,
	): Promise<void> {
		const tableName = this.metadata.tableName;

		// `createdAt`/`updatedAt` carry DB-level defaults, so the insert omits
		// them; the conflict path bumps `updatedAt` explicitly.
		await this.query(
			`INSERT INTO "${tableName}" ("workflowId", "publishedVersionId", "status")
			 VALUES ($1, $2, 'pending')
			 ON CONFLICT ("workflowId") WHERE "status" = 'pending'
			 DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId", "updatedAt" = CURRENT_TIMESTAMP(3)`,
			[workflowId, publishedVersionId],
		);
	}

	private async enqueueWithSqliteUpsert(
		workflowId: string,
		publishedVersionId: string,
	): Promise<void> {
		const tableName = this.metadata.tableName;

		await this.query(
			`INSERT INTO "${tableName}" ("workflowId", "publishedVersionId", "status")
			 VALUES (?, ?, 'pending')
			 ON CONFLICT ("workflowId") WHERE "status" = 'pending'
			 DO UPDATE SET "publishedVersionId" = excluded."publishedVersionId", "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
			[workflowId, publishedVersionId],
		);
	}

	/**
	 * Atomically claim the oldest pending record by transitioning its status to
	 * `in_progress`. Postgres uses `FOR UPDATE SKIP LOCKED` so concurrent
	 * consumers never receive the same row; SQLite serializes the find-then-update
	 * via the sqlite-pooled driver's `BEGIN IMMEDIATE` transactions, so
	 * concurrent claimers can't both see the same pending row.
	 *
	 * Returns the claimed record, or `null` when nothing is pending.
	 */
	async claimNextPendingRecord(): Promise<WorkflowPublicationOutbox | null> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.claimWithPostgresLocking();
		}

		return await this.claimWithSqliteTransaction();
	}

	private async claimWithPostgresLocking(): Promise<WorkflowPublicationOutbox | null> {
		const tableName = this.metadata.tableName;

		// TypeORM's Postgres driver returns `[rows, affectedCount]` from a raw
		// UPDATE ... RETURNING (unlike INSERT, which returns the rows directly).
		const [rows]: [WorkflowPublicationOutbox[], number] = await this.query(
			// Ordering by id gives us FIFO behaviour: ids are monotonically
			// assigned at insert, so oldest pending row is processed first.
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

		return rows[0] ?? null;
	}

	private async claimWithSqliteTransaction(): Promise<WorkflowPublicationOutbox | null> {
		return await this.manager.transaction(async (tx) => {
			// Ordering by id gives us FIFO behaviour: ids are monotonically
			// assigned at insert, so oldest pending row is processed first.
			const record = await tx.findOne(WorkflowPublicationOutbox, {
				where: { status: 'pending' },
				order: { id: 'ASC' },
			});

			if (!record) return null;

			await tx.update(WorkflowPublicationOutbox, record.id, { status: 'in_progress' });
			record.status = 'in_progress';
			return record;
		});
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
