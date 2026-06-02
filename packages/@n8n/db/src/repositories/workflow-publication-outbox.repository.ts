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
	 * Enqueue a publication for `workflowId`. If a pending record already exists
	 * for the same workflow, its `publishedVersionId` is updated in place (the
	 * partial unique index `(workflowId) WHERE status = 'pending'` enforces this
	 * one-pending-per-workflow invariant). Re-enqueueing a newer version while a
	 * publication is still pending supersedes the older `publishedVersionId`
	 * rather than queueing redundant work.
	 */
	async enqueue(
		workflowId: string,
		publishedVersionId: string,
	): Promise<WorkflowPublicationOutbox> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.enqueueWithPostgresUpsert(workflowId, publishedVersionId);
		}

		return await this.enqueueWithSimpleUpsert(workflowId, publishedVersionId);
	}

	private async enqueueWithPostgresUpsert(
		workflowId: string,
		publishedVersionId: string,
	): Promise<WorkflowPublicationOutbox> {
		const tableName = this.metadata.tableName;

		const result: WorkflowPublicationOutbox[] = await this.query(
			`INSERT INTO "${tableName}" ("workflowId", "publishedVersionId", "status", "createdAt", "updatedAt")
			 VALUES ($1, $2, 'pending', NOW(), NOW())
			 ON CONFLICT ("workflowId") WHERE "status" = 'pending'
			 DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId", "updatedAt" = NOW()
			 RETURNING *`,
			[workflowId, publishedVersionId],
		);

		return result[0];
	}

	private async enqueueWithSimpleUpsert(
		workflowId: string,
		publishedVersionId: string,
	): Promise<WorkflowPublicationOutbox> {
		const existing = await this.findOne({ where: { workflowId, status: 'pending' } });

		if (existing) {
			await this.update(existing.id, { publishedVersionId });
			existing.publishedVersionId = publishedVersionId;
			return existing;
		}

		return await this.save({ workflowId, publishedVersionId, status: 'pending' });
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
