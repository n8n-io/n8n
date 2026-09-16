import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Brackets, DataSource, In, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import {
	UNPUBLISH_VERSION_SENTINEL,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxStatus as Status,
	type WorkflowPublicationReason,
} from '../entities/workflow-publication-outbox';
import { isUniqueConstraintError } from '../utils/is-unique-constraint-error';

/** Sqlite bound-variable budget per statement (ids + the reason); safely under every build's cap. */
const SQLITE_ENQUEUE_CHUNK_SIZE = 998;

@Service()
export class WorkflowPublicationOutboxRepository extends Repository<WorkflowPublicationOutbox> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(WorkflowPublicationOutbox, dataSource.manager);
	}

	/**
	 * The in-flight (pending or in_progress) publication for a workflow, or null.
	 * In-progress is preferred when both exist.
	 */
	async findInFlightByWorkflowId(workflowId: string): Promise<WorkflowPublicationOutbox | null> {
		const inFlight = await this.findBy({
			workflowId,
			status: In([Status.InProgress, Status.Pending]),
		});
		return inFlight.find((record) => record.status === Status.InProgress) ?? inFlight[0] ?? null;
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
	 *
	 * The conflict path also supersedes `reason`: a fresher enqueue's intent
	 * wins (e.g. a user publish replacing a pending startup record).
	 */
	async enqueue(
		workflowId: string,
		publishedVersionId: string,
		reason: WorkflowPublicationReason,
		trx?: EntityManager,
	): Promise<void> {
		if (this.globalConfig.database.type === 'postgresdb') {
			await this.enqueueWithPostgresUpsert(
				workflowId,
				publishedVersionId,
				reason,
				trx ?? this.manager,
			);
			return;
		}

		await this.enqueueWithSqliteUpsert(workflowId, publishedVersionId, reason, trx ?? this.manager);
	}

	private async enqueueWithPostgresUpsert(
		workflowId: string,
		publishedVersionId: string,
		reason: WorkflowPublicationReason,
		trx: EntityManager,
	): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');

		// `createdAt`/`updatedAt` carry DB-level defaults, so the insert omits
		// them; the conflict path bumps `updatedAt` explicitly.
		await trx.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status", "reason")
			 VALUES ($1, $2, '${Status.Pending}', $3)
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = EXCLUDED."publishedVersionId", "reason" = EXCLUDED."reason", "updatedAt" = CURRENT_TIMESTAMP(3)`,
			[workflowId, publishedVersionId, reason],
		);
	}

	private async enqueueWithSqliteUpsert(
		workflowId: string,
		publishedVersionId: string,
		reason: WorkflowPublicationReason,
		trx: EntityManager,
	): Promise<void> {
		const tableName = this.getTableName('workflow_publication_outbox');

		await trx.query(
			`INSERT INTO ${tableName} ("workflowId", "publishedVersionId", "status", "reason")
			 VALUES (?, ?, '${Status.Pending}', ?)
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO UPDATE SET "publishedVersionId" = excluded."publishedVersionId", "reason" = excluded."reason", "updatedAt" = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')`,
			[workflowId, publishedVersionId, reason],
		);
	}

	/**
	 * Enqueue a pending publication record for each given workflow that still
	 * exists, in a single statement. Used by reconciliation, which must be able to
	 * enqueue whatever its detection returns — refusing a workflow here would
	 * re-detect it on every pass forever. Published workflows are enqueued at
	 * their canonical `activeVersionId`; unpublished (including archived) ones get
	 * an unpublish record that clears their stale trigger-status rows. Idempotent
	 * via the same partial-unique-index upsert as {@link enqueue}.
	 */
	async enqueueByWorkflowIds(
		workflowIds: string[],
		reason: WorkflowPublicationReason,
	): Promise<void> {
		if (workflowIds.length === 0) return;

		if (this.globalConfig.database.type === 'postgresdb') {
			await this.enqueueByWorkflowIdsWithPostgresUpsert(workflowIds, reason);
			return;
		}

		await this.enqueueByWorkflowIdsWithSqliteUpsert(workflowIds, reason);
	}

	private async enqueueByWorkflowIdsWithPostgresUpsert(
		workflowIds: string[],
		reason: WorkflowPublicationReason,
	): Promise<void> {
		const outboxTableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');

		// COALESCE: an unpublished workflow has no `activeVersionId`, but the column
		// is NOT NULL, so those records carry the unpublish sentinel. It is inert —
		// the applier dispatches an unpublish on the workflow's null
		// `activeVersionId` and never reads the record's version. (Mirrored in the
		// sqlite variant below.)
		//
		// DO NOTHING, unlike `enqueue`: reconciliation's detection and this enqueue
		// are two separate statements, so a publish/unpublish can commit a pending
		// record in the gap between them (detection's in-flight exclusion saw an
		// earlier snapshot). Such a record is at least as fresh as this statement's
		// snapshot — overwriting it could roll the workflow back to a stale version.
		await this.query(
			`INSERT INTO ${outboxTableName} ("workflowId", "publishedVersionId", "status", "reason")
			 SELECT w."id", COALESCE(w."activeVersionId", '${UNPUBLISH_VERSION_SENTINEL}'), '${Status.Pending}', $2
			 FROM ${workflowTableName} w
			 WHERE w."id" = ANY($1)
			 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
			 DO NOTHING`,
			[workflowIds, reason],
		);
	}

	private async enqueueByWorkflowIdsWithSqliteUpsert(
		workflowIds: string[],
		reason: WorkflowPublicationReason,
	): Promise<void> {
		const outboxTableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');

		// One placeholder is bound per id and sqlite caps bound variables per
		// statement, while a fresh leader can pass every active workflow at once.
		// Chunked upserts stay idempotent, so a failure mid-batch just leaves the
		// remainder for the next reconciliation pass.
		for (let i = 0; i < workflowIds.length; i += SQLITE_ENQUEUE_CHUNK_SIZE) {
			const chunk = workflowIds.slice(i, i + SQLITE_ENQUEUE_CHUNK_SIZE);
			const placeholders = chunk.map(() => '?').join(', ');

			await this.query(
				`INSERT INTO ${outboxTableName} ("workflowId", "publishedVersionId", "status", "reason")
				 SELECT w."id", COALESCE(w."activeVersionId", '${UNPUBLISH_VERSION_SENTINEL}'), '${Status.Pending}', ?
				 FROM ${workflowTableName} w
				 WHERE w."id" IN (${placeholders})
				 ON CONFLICT ("workflowId", "status") WHERE "status" IN ('${Status.Pending}', '${Status.InProgress}')
				 DO NOTHING`,
				[reason, ...chunk],
			);
		}
	}

	/**
	 * Workflows whose `workflow_published_version` mapping disagrees with the
	 * workflow's canonical `activeVersionId`, in either direction: published but
	 * the mapping is stale or missing (a lost or rolled-back publication), or
	 * unpublished but a mapping row remains (a missed unpublish).
	 *
	 * Workflows with an in-flight (pending/in_progress) record are excluded:
	 * mid-publication skew is expected, and that record is about to converge it.
	 * The exclusion lives in the same statement as the detection, so there is no
	 * torn read between "is it skewed" and "is it in flight". This also covers
	 * the applier's mid-apply window: publish/unpublish commit the
	 * `activeVersionId` change and the outbox enqueue in one transaction, and the
	 * applier only mutates the mapping while its record is `in_progress` — so a
	 * skew visible with no in-flight record is a real divergence (e.g. a stalled
	 * processor writing the mapping after losing its lease), never a normal
	 * mid-flight state.
	 *
	 * Workflows whose most recent record is a terminal `failed` for the version
	 * that is currently active are excluded, as in
	 * {@link findTriggerStatusDriftedWorkflowIds}: a publication failing before the
	 * mapping advances leaves the skew forever, so this would loop every pass.
	 * Matching on the version keeps the unpublish direction healing — there the
	 * active version is null, so a failed teardown never matches and is retried.
	 */
	async findVersionSkewedWorkflowIds(): Promise<string[]> {
		const outboxTableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');
		const publishedVersionTableName = this.getTableName('workflow_published_version');

		// `(x IS NULL) <> (y IS NULL) OR x <> y` is the portable spelling of
		// `activeVersionId IS DISTINCT FROM publishedVersionId`, which sqlite
		// lacks; both-null (never published, no mapping) compares as equal.
		//
		// The failed-record match relies on plain `=`: an unpublished workflow has a
		// null `activeVersionId`, so nothing matches and its skew stays detectable.
		const rows: Array<{ workflowId: string }> = await this.query(
			`SELECT w."id" AS "workflowId"
			 FROM ${workflowTableName} w
			 LEFT JOIN ${publishedVersionTableName} pv ON pv."workflowId" = w."id"
			 WHERE (
				 (w."activeVersionId" IS NULL) <> (pv."workflowId" IS NULL)
				 OR w."activeVersionId" <> pv."publishedVersionId"
			 )
			 AND NOT EXISTS (
				 SELECT 1 FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 AND o."status" IN ('${Status.Pending}', '${Status.InProgress}')
			 )
			 AND NOT EXISTS (
				 SELECT 1 FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 AND o."status" = '${Status.Failed}'
				 AND o."publishedVersionId" = w."activeVersionId"
				 AND o."id" = (
					 SELECT MAX(latest."id") FROM ${outboxTableName} latest
					 WHERE latest."workflowId" = w."id"
				 )
			 )`,
		);

		return rows.map((row) => row.workflowId);
	}

	/**
	 * Published workflows where any trigger-status row was recorded for a version
	 * other than the workflow's canonical `activeVersionId`. Catches a crash or a
	 * stale (zombie) writer between the published-version advance and the status
	 * report: the `workflow_published_version` mapping may already be correct, so
	 * {@link findVersionSkewedWorkflowIds} cannot see it — only the rows lag.
	 *
	 * Workflows with an in-flight (pending/in_progress) record are excluded in
	 * the same statement, for the same reason as the version-skew check: the
	 * reporter only writes rows while its record is `in_progress`, so row drift
	 * with no in-flight record is a real divergence, never a normal mid-flight
	 * state.
	 *
	 * Workflows whose most recent record is terminal `failed` are excluded for
	 * the same reason as in {@link findUnreportedPublishedWorkflowIds}: a
	 * publication that deterministically fails before reporting leaves the rows
	 * drifted forever, so re-enqueueing would loop every pass. A user republish
	 * (a fresh pending record) still recovers.
	 */
	async findTriggerStatusDriftedWorkflowIds(): Promise<string[]> {
		const outboxTableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');
		const triggerStatusTableName = this.getTableName('workflow_publication_trigger_status');

		// Both compared columns are non-null here (`activeVersionId` is filtered,
		// `versionId` is NOT NULL), so plain `<>` needs no null-emulation.
		const rows: Array<{ workflowId: string }> = await this.query(
			`SELECT DISTINCT w."id" AS "workflowId"
			 FROM ${workflowTableName} w
			 INNER JOIN ${triggerStatusTableName} ts ON ts."workflowId" = w."id"
			 WHERE w."activeVersionId" IS NOT NULL
			 AND ts."versionId" <> w."activeVersionId"
			 AND NOT EXISTS (
				 SELECT 1 FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 AND o."status" IN ('${Status.Pending}', '${Status.InProgress}')
			 )
			 AND COALESCE((
				 SELECT o."status" FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 ORDER BY o."id" DESC LIMIT 1
			 ), '') <> '${Status.Failed}'`,
		);

		return rows.map((row) => row.workflowId);
	}

	/**
	 * Published, non-archived workflows with no trigger-status rows at all — no
	 * publication was ever reported for them. Two populations: workflows
	 * published while the publication service flag was off (only the reporter
	 * writes rows), and publications that terminally failed before reporting any
	 * per-trigger status (a consumer-wrapped unexpected throw, `version-missing`).
	 *
	 * The failed population is why workflows whose most recent outbox record is
	 * terminal `failed` are excluded: re-enqueueing them would fail before
	 * reporting again, still leave zero rows, and so be re-detected on every
	 * pass forever, reporting an error each round. Recovery is not lost — a user
	 * republish enqueues a fresh pending record, which is excluded here as
	 * in-flight while it processes normally. `partial_success` always writes
	 * rows, so it never reaches this bucket.
	 *
	 * Same in-flight exclusion, in the same statement, as
	 * {@link findVersionSkewedWorkflowIds}.
	 */
	async findUnreportedPublishedWorkflowIds(): Promise<string[]> {
		const outboxTableName = this.getTableName('workflow_publication_outbox');
		const workflowTableName = this.getTableName('workflow_entity');
		const triggerStatusTableName = this.getTableName('workflow_publication_trigger_status');

		// "Most recent" is the highest id: ids are monotonically assigned, the
		// same FIFO assumption the claim query relies on. Sqlite (>= 3.23) accepts
		// the `false` literal, so one statement serves both dialects.
		const rows: Array<{ workflowId: string }> = await this.query(
			`SELECT w."id" AS "workflowId"
			 FROM ${workflowTableName} w
			 WHERE w."activeVersionId" IS NOT NULL
			 AND w."isArchived" = false
			 AND NOT EXISTS (
				 SELECT 1 FROM ${triggerStatusTableName} ts
				 WHERE ts."workflowId" = w."id"
			 )
			 AND NOT EXISTS (
				 SELECT 1 FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 AND o."status" IN ('${Status.Pending}', '${Status.InProgress}')
			 )
			 AND COALESCE((
				 SELECT o."status" FROM ${outboxTableName} o
				 WHERE o."workflowId" = w."id"
				 ORDER BY o."id" DESC LIMIT 1
			 ), '') <> '${Status.Failed}'`,
		);

		return rows.map((row) => row.workflowId);
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
					 o."status" = '${Status.Pending}'
					 -- skip workflows that are already being processed
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

	/**
	 * Return a claimed (`in_progress`) record to `pending` so another leader can
	 * reprocess it, when this instance is no longer the leader. Best-effort: zero
	 * rows affected (already resolved or re-leased) is not an error.
	 *
	 * If a newer pending record was enqueued meanwhile, the flip collides with the
	 * one-pending-row-per-workflow unique index; that record supersedes this one, so
	 * we delete this row instead. Catching the collision keeps it atomic against a
	 * concurrent enqueue.
	 */
	async returnToPending(id: number): Promise<void> {
		try {
			await this.update(
				{ id, status: Status.InProgress },
				{ status: Status.Pending, errorMessage: null },
			);
		} catch (error) {
			if (!isUniqueConstraintError(error)) throw error;
			await this.delete({ id, status: Status.InProgress });
		}
	}

	/**
	 * Mark a claimed record as successfully processed. Pass `trx` to enroll in an
	 * existing transaction. An optional `warningMessage` is stored in
	 * `errorMessage` for a record that completed with a non-fatal side effect
	 * (e.g. an abandoned external webhook deregistration).
	 */
	async markCompleted(id: number, trx?: EntityManager, warningMessage?: string): Promise<void> {
		const manager = trx ?? this.manager;
		const result = await manager.update(
			WorkflowPublicationOutbox,
			{ id, status: Status.InProgress },
			{ status: Status.Completed, errorMessage: warningMessage ?? null },
		);
		this.assertSingleRowAffected(result.affected, id, Status.Completed);
	}

	/** Mark a claimed record as failed and record the error for diagnostics. Pass `trx` to enroll in an existing transaction. */
	async markFailed(id: number, errorMessage: string, trx?: EntityManager): Promise<void> {
		const manager = trx ?? this.manager;
		const result = await manager.update(
			WorkflowPublicationOutbox,
			{ id, status: Status.InProgress },
			{ status: Status.Failed, errorMessage },
		);
		this.assertSingleRowAffected(result.affected, id, Status.Failed);
	}

	/**
	 * Mark a claimed record as partially successful: the published version advanced
	 * and some triggers are running, but others failed to (de)register. The message
	 * carries per-node detail for diagnostics. The workflow stays published. Pass
	 * `trx` to enroll in an existing transaction.
	 */
	async markPartialSuccess(id: number, errorMessage: string, trx?: EntityManager): Promise<void> {
		const manager = trx ?? this.manager;
		const result = await manager.update(
			WorkflowPublicationOutbox,
			{ id, status: Status.InProgress },
			{ status: Status.PartialSuccess, errorMessage },
		);
		this.assertSingleRowAffected(result.affected, id, Status.PartialSuccess);
	}

	/**
	 * Delete terminal records older than their retention window, in a single batch.
	 * `completed` and `failed`/`partial_success` have different retention configs.
	 *
	 * @returns number deleted so the caller can loop until a batch comes back short.
	 */
	async deleteTerminalOlderThan(
		completedRetentionSeconds: number,
		failedRetentionSeconds: number,
		batchSize: number,
	): Promise<number> {
		if (this.globalConfig.database.type === 'postgresdb') {
			return await this.deleteTerminalWithPostgres(
				completedRetentionSeconds,
				failedRetentionSeconds,
				batchSize,
			);
		}

		return await this.deleteTerminalWithSqlite(
			completedRetentionSeconds,
			failedRetentionSeconds,
			batchSize,
		);
	}

	private async deleteTerminalWithPostgres(
		completedRetentionSeconds: number,
		failedRetentionSeconds: number,
		batchSize: number,
	): Promise<number> {
		const tableName = this.getTableName('workflow_publication_outbox');

		const [row]: Array<{ count: string | number }> = await this.query(
			`WITH deleted AS (
				DELETE FROM ${tableName}
				WHERE "id" IN (
					SELECT "id" FROM ${tableName}
					WHERE ("status" = '${Status.Completed}' AND "updatedAt" < CURRENT_TIMESTAMP(3) - make_interval(secs => $1))
						OR ("status" IN ('${Status.Failed}', '${Status.PartialSuccess}') AND "updatedAt" < CURRENT_TIMESTAMP(3) - make_interval(secs => $2))
					LIMIT $3
				)
				RETURNING "id"
			)
			SELECT COUNT(*) AS "count" FROM deleted`,
			[completedRetentionSeconds, failedRetentionSeconds, batchSize],
		);

		return Number(row.count);
	}

	private async deleteTerminalWithSqlite(
		completedRetentionSeconds: number,
		failedRetentionSeconds: number,
		batchSize: number,
	): Promise<number> {
		const tableName = this.getTableName('workflow_publication_outbox');
		const completedModifier = `-${Math.round(completedRetentionSeconds)} seconds`;
		const failedModifier = `-${Math.round(failedRetentionSeconds)} seconds`;

		return await this.manager.transaction(async (tx) => {
			await tx.query(
				`DELETE FROM ${tableName}
				 WHERE "id" IN (
					SELECT "id" FROM ${tableName}
					WHERE ("status" = '${Status.Completed}' AND "updatedAt" < STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', ?))
						OR ("status" IN ('${Status.Failed}', '${Status.PartialSuccess}') AND "updatedAt" < STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', ?))
					LIMIT ?
				 )`,
				[completedModifier, failedModifier, batchSize],
			);
			const [{ count }]: Array<{ count: number }> = await tx.query('SELECT changes() AS count');
			return Number(count);
		});
	}

	/**
	 * Per-status record count and oldest `createdAt`, for the metrics gauges, in a
	 * single grouped query. Statuses with no rows are absent from the map. The
	 * oldest-record-age gauge only reads the active (`pending`/`in_progress`)
	 * entries; the count gauge reads them all.
	 */
	async getRecordStatsByStatus(): Promise<Map<Status, { count: number; oldestCreatedAt: Date }>> {
		const rows = await this.createQueryBuilder('o')
			.select('o.status', 'status')
			.addSelect('COUNT(*)', 'count')
			.addSelect('MIN(o.createdAt)', 'oldestCreatedAt')
			.groupBy('o.status')
			.getRawMany<{ status: Status; count: string | number; oldestCreatedAt: string | Date }>();

		return new Map(
			rows.map((row) => [
				row.status,
				{ count: Number(row.count), oldestCreatedAt: this.parseTimestamp(row.oldestCreatedAt) },
			]),
		);
	}

	/**
	 * Postgres hydrates timestamps into `Date`s directly. SQLite returns a raw UTC
	 * string with no zone designator, which `new Date()` would read as local time;
	 * tag it as UTC so the instant matches what the driver stored.
	 */
	private parseTimestamp(value: string | Date): Date {
		if (value instanceof Date) return value;
		return new Date(`${value.replace(' ', 'T')}Z`);
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
