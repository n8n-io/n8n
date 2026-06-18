import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Brackets, DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxStatus as Status,
} from '../entities/workflow-publication-outbox';

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
	 *
	 * Pass `trx` to run the UPSERT inside an existing transaction, e.g. to make
	 * the enqueue atomic with a `workflow_entity` update.
	 */
	async enqueue(
		workflowId: string,
		publishedVersionId: string,
		trx?: EntityManager,
	): Promise<void> {
		if (this.globalConfig.database.type === 'postgresdb') {
			await this.enqueueWithPostgresUpsert(workflowId, publishedVersionId, trx ?? this.manager);
			return;
		}

		await this.enqueueWithSqliteUpsert(workflowId, publishedVersionId, trx ?? this.manager);
	}

	private async enqueueWithPostgresUpsert(
		workflowId: string,
		publishedVersionId: string,
		trx: EntityManager,
	): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');

		// `createdAt`/`updatedAt` carry DB-level defaults, so the insert omits
		// them; the conflict path bumps `updatedAt` explicitly.
		await trx.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status")
			 VALUES ($1, $2, '${Status.Pending}')
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId", "updatedAt" = CURRENT_TIMESTAMP(3)`,
			[workflowId, publishedVersionId],
		);
	}

	private async enqueueWithSqliteUpsert(
		workflowId: string,
		publishedVersionId: string,
		trx: EntityManager,
	): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');

		await trx.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status")
			 VALUES (?, ?, '${Status.Pending}')
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = excluded."publishedVersionId", "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
			[workflowId, publishedVersionId],
		);
	}

	/**
	 * Enqueue a pending publication record for every active, non-archived workflow
	 * at its current active version, in a single statement. Idempotent via the same
	 * partial-unique-index upsert as {@link enqueue}.
	 */
	async enqueueAllActiveWorkflows(): Promise<void> {
		if (this.globalConfig.database.type === 'postgresdb') {
			await this.enqueueAllActiveWithPostgresUpsert();
			return;
		}

		await this.enqueueAllActiveWithSqliteUpsert();
	}

	private async enqueueAllActiveWithPostgresUpsert(): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');

		await this.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status")
			 SELECT w."id", w."activeVersionId", '${Status.Pending}'
			 FROM ${workflowTableName} w
			 WHERE w."activeVersionId" IS NOT NULL AND w."isArchived" = false
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId", "updatedAt" = CURRENT_TIMESTAMP(3)`,
		);
	}

	private async enqueueAllActiveWithSqliteUpsert(): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');

		await this.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status")
			 SELECT w."id", w."activeVersionId", '${Status.Pending}'
			 FROM ${workflowTableName} w
			 WHERE w."activeVersionId" IS NOT NULL AND w."isArchived" = 0
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = excluded."publishedVersionId", "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
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
		const tableName = this.getTableName('workflow_publication_outbox');
		const leaseSeconds = this.globalConfig.workflows.publicationOutboxLeaseSeconds;

		// TypeORM's Postgres driver returns `[rows, affectedCount]` from a raw
		// UPDATE ... RETURNING (unlike INSERT, which returns the rows directly).
		const [rows]: [WorkflowPublicationOutbox[], number] = await this.query(
			// Claim the oldest pending row whose workflow has no in-progress row,
			// or re-lease a stale in-progress row whose leader likely died (no
			// progress for longer than the lease). Reprocessing is idempotent via
			// the reconciliation diff, so re-leasing is safe. Ordering by id gives
			// FIFO: ids are monotonically assigned, so the oldest is processed first.
			`UPDATE ${tableName}
			 SET "status" = '${Status.InProgress}', "updatedAt" = CURRENT_TIMESTAMP(3)
			 WHERE "id" = (
				 SELECT o."id" FROM ${tableName} o
				 WHERE (
					 -- skip workflows that are already being processed
					 o."status" = '${Status.Pending}'
					 AND NOT EXISTS (
						 SELECT 1 FROM ${tableName} ip
						 WHERE ip."workflowId" = o."workflowId" AND ip."status" = '${Status.InProgress}'
					 )
				 )
				 OR (
					 -- reclaim expired leases
					 o."status" = '${Status.InProgress}'
					 AND o."updatedAt" < CURRENT_TIMESTAMP(3) - make_interval(secs => $1)
				 )
				 ORDER BY o."id" ASC
				 LIMIT 1
				 FOR UPDATE SKIP LOCKED
			 )
			 RETURNING *`,
			[leaseSeconds],
		);

		return rows[0] ?? null;
	}

	// Two statements rather than one because `update` doesn't return the claimed
	// row. The `BEGIN IMMEDIATE` transaction serializes claimers.
	private async claimWithSqliteTransaction(): Promise<WorkflowPublicationOutbox | null> {
		const leaseSeconds = Math.round(this.globalConfig.workflows.publicationOutboxLeaseSeconds);

		return await this.manager.transaction(async (tx) => {
			const queryBuilder = tx.createQueryBuilder(WorkflowPublicationOutbox, 'o');

			const noInProgressSubquery = queryBuilder
				.subQuery()
				.select('1')
				.from(WorkflowPublicationOutbox, 'ip')
				.where('ip.workflowId = o.workflowId')
				.andWhere('ip.status = :inProgress')
				.getQuery();

			// Claim the oldest pending row whose workflow has no in-progress row,
			// or re-lease a stale in-progress row whose leader likely died (no
			// progress for longer than the lease). Reprocessing is idempotent via
			// the reconciliation diff, so re-leasing is safe. Ordering by id gives
			// FIFO: ids are monotonically assigned, so the oldest is processed first.
			const record = await queryBuilder
				.where(
					new Brackets((qb) => {
						qb.where('o.status = :pending', { pending: Status.Pending }).andWhere(
							`NOT EXISTS ${noInProgressSubquery}`,
						);
					}),
				)
				.orWhere(
					new Brackets((qb) => {
						qb.where('o.status = :inProgress').andWhere(
							"o.updatedAt < STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', :leaseModifier)",
							{ leaseModifier: `-${leaseSeconds} seconds` },
						);
					}),
				)
				.setParameter('inProgress', Status.InProgress)
				.orderBy('o.id', 'ASC')
				.getOne();

			if (!record) return null;

			// `{ id }` (not `{ id, status: Pending }`) so a reclaimed in-progress
			// row is re-leased too. TypeORM bumps `updatedAt` on `.update()`.
			await tx.update(WorkflowPublicationOutbox, { id: record.id }, { status: Status.InProgress });
			record.status = Status.InProgress;
			return record;
		});
	}

	/** Mark a claimed record as successfully processed. */
	async markCompleted(id: number): Promise<void> {
		const result = await this.update(
			{ id, status: Status.InProgress },
			{ status: Status.Completed, errorMessage: null },
		);
		this.assertSingleRowAffected(result.affected, id, Status.Completed);
	}

	/** Mark a claimed record as failed and record the error for diagnostics. */
	async markFailed(id: number, errorMessage: string): Promise<void> {
		const result = await this.update(
			{ id, status: Status.InProgress },
			{ status: Status.Failed, errorMessage },
		);
		this.assertSingleRowAffected(result.affected, id, Status.Failed);
	}

	/**
	 * Mark a claimed record as partially successful: the published version advanced
	 * and some triggers are running, but others failed to (de)register. The message
	 * carries per-node detail for diagnostics. The workflow stays published.
	 */
	async markPartialSuccess(id: number, errorMessage: string): Promise<void> {
		const result = await this.update(
			{ id, status: Status.InProgress },
			{ status: Status.PartialSuccess, errorMessage },
		);
		this.assertSingleRowAffected(result.affected, id, Status.PartialSuccess);
	}

	/**
	 * Guards against transitioning a record that is no longer the in-progress row
	 * we expect (e.g. it was already resolved or never claimed): such a transition
	 * affects zero rows and would otherwise be lost silently.
	 */
	private assertSingleRowAffected(
		affected: number | null | undefined,
		id: number,
		target: Status,
	): void {
		if (affected !== 1) {
			throw new UnexpectedError(
				`Expected to transition outbox record ${id} to '${target}', but ${affected ?? 0} rows were affected. The record may not be in progress.`,
			);
		}
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
