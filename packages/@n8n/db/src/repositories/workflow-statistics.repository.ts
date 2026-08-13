import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { DataSource, type EntityManager, QueryFailedError, Repository } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import {
	ProjectRelation,
	Role,
	SharedWorkflow,
	WorkflowEntity,
	WorkflowStatistics,
} from '../entities';
import type { User } from '../entities';
import { StatisticsNames } from '../entities/types-db';

type StatisticsInsertResult = 'insert' | 'failed' | 'alreadyExists';
type StatisticsUpsertResult = StatisticsInsertResult | 'update';

/**
 * A counter row the fold just created for the first time, i.e. a workflow's first-ever
 * production success or failure. The rollup uses these to fire one-time milestone events.
 */
export type FirstOccurrenceRow = {
	name: StatisticsNames;
	workflowId: string;
	workflowName: string | null;
	firstEventMs: number;
};

/** One row returned by the fold query: the batch total (`delta_rows`) plus per-counter fold results. */
type FoldRow = {
	delta_rows: number; // `::int` cast in the query -> pg returns int4 as a JS number
	workflowId: string;
	name: StatisticsNames;
	inserted: boolean;
	workflowName: string | null;
	firstEvent: Date | string;
};

@Service()
export class WorkflowStatisticsRepository extends Repository<WorkflowStatistics> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(WorkflowStatistics, dataSource.manager);
	}

	async insertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
		workflowName?: string,
	): Promise<StatisticsInsertResult> {
		// Try to insert the data loaded statistic
		try {
			const exists = await this.findOne({
				where: {
					workflowId,
					name: eventName,
				},
			});
			if (exists) return 'alreadyExists';
			await this.insert({
				workflowId,
				name: eventName,
				count: 1,
				rootCount: 1,
				latestEvent: new Date(),
				workflowName: workflowName ?? null,
			});
			return 'insert';
		} catch (error) {
			// if it's a duplicate key error then that's fine, otherwise throw the error
			if (!(error instanceof QueryFailedError)) {
				throw error;
			}
			// If it is a query failed error, we return
			return 'failed';
		}
	}

	async upsertWorkflowStatistics(
		eventName: StatisticsNames,
		workflowId: string,
		isRootExecution: boolean,
		workflowName?: string,
	): Promise<StatisticsUpsertResult> {
		if (this.globalConfig.database.type !== 'sqlite') {
			throw new UnexpectedError(
				'upsertWorkflowStatistics is SQLite-only; use appendIncrement + rollup on Postgres',
			);
		}

		const escapedTableName = this.manager.connection.driver.escape(this.metadata.tableName);

		try {
			const rootCountIncrement = isRootExecution ? 1 : 0;
			await this.query(
				`INSERT INTO ${escapedTableName} ("count", "rootCount", "name", "workflowId", "workflowName", "latestEvent")
				VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT (workflowId, name)
				DO UPDATE SET
					count = count + 1,
					rootCount = rootCount + ?,
					workflowName = excluded.workflowName,
					latestEvent = CURRENT_TIMESTAMP`,
				[rootCountIncrement, eventName, workflowId, workflowName ?? null, rootCountIncrement],
			);

			// SQLite does not offer a reliable way to know whether or not an insert or update happened.
			// We'll use a naive approach in this case. Query again after and it might cause us to miss the
			// first production execution sometimes due to concurrency, but it's the only way.
			const counter = await this.findOne({
				select: ['count'],
				where: { name: eventName, workflowId },
			});

			return (counter?.count ?? 0) > 1 ? 'update' : counter?.count === 1 ? 'insert' : 'failed';
		} catch (error) {
			if (error instanceof QueryFailedError) return 'failed';
			throw error;
		}
	}

	private deltaTableName() {
		const { tablePrefix } = this.globalConfig.database;
		return this.manager.connection.driver.escape(`${tablePrefix}workflow_statistics_delta`);
	}

	async appendIncrement(
		eventName: StatisticsNames,
		workflowId: string,
		isRootExecution: boolean,
		workflowName?: string,
	): Promise<void> {
		const table = this.deltaTableName();
		await this.query(
			`INSERT INTO ${table} ("workflowId", "name", "rootCountDelta", "workflowName") VALUES ($1, $2, $3, $4)`,
			[workflowId, eventName, isRootExecution ? 1 : 0, workflowName ?? null],
		);
	}

	async rollupIncrements(
		manager: EntityManager,
		batchSize: number,
	): Promise<{ increments: number; firstOccurrences: FirstOccurrenceRow[] }> {
		const stats = this.manager.connection.driver.escape(this.metadata.tableName);
		const delta = this.deltaTableName();

		/**
		 * Query walkthrough
		 *
		 * Fold a batch of increments into the target in one atomic statement, so concurrent appends and crashes
		 * cannot double-count or drop rows. Whatever was not claimed-and-folded stays for next tick.
		 *
		 * - `batch`    Claim the oldest increments (DELETE + RETURNING, so they cannot be folded twice).
		 * - `agg`      Sum the claimed rows per (workflowId, name) into the totals to add.
		 * - `upsert`   Add the totals into the counter, creating the row if new. `"xmax" = 0` flags rows it created.
		 * - `SELECT`   Return how many increments processed, plus the created (first-ever) rows for milestones.
		 */
		const rows = await manager.query<FoldRow[]>(
			`WITH batch AS (
				DELETE FROM ${delta}
				WHERE id IN (SELECT id FROM ${delta} ORDER BY id LIMIT $1)
				RETURNING "workflowId", "name", "rootCountDelta", "createdAt", "workflowName"
			),
			agg AS (
				SELECT "workflowId", "name",
					COUNT(*) AS "countIncrement",
					SUM("rootCountDelta") AS "rootCountIncrement",
					MAX("createdAt") AS "latestEvent",
					MIN("createdAt") AS "firstEvent",
					(ARRAY_AGG("workflowName" ORDER BY "createdAt" DESC NULLS LAST))[1] AS "workflowName"
				FROM batch GROUP BY "workflowId", "name"
			),
			upsert AS (
				INSERT INTO ${stats} ("workflowId", "name", "count", "rootCount", "latestEvent", "workflowName")
				SELECT "workflowId", "name", "countIncrement", "rootCountIncrement", "latestEvent", "workflowName" FROM agg
				ON CONFLICT ("name", "workflowId") DO UPDATE SET
					"count" = ${stats}."count" + EXCLUDED."count",
					"rootCount" = ${stats}."rootCount" + EXCLUDED."rootCount",
					"latestEvent" = GREATEST(${stats}."latestEvent", EXCLUDED."latestEvent"),
					"workflowName" = EXCLUDED."workflowName"
				RETURNING "workflowId", "name", ("xmax" = 0) AS inserted
			)
			SELECT (SELECT COUNT(*) FROM batch)::int AS delta_rows,
				u."workflowId", u."name", u.inserted, a."workflowName", a."firstEvent"
			FROM upsert u JOIN agg a ON a."workflowId" = u."workflowId" AND a."name" = u."name"`,
			[batchSize],
		);

		if (rows.length === 0) return { increments: 0, firstOccurrences: [] };

		const firstOccurrences: FirstOccurrenceRow[] = rows
			.filter(
				(r) =>
					r.inserted &&
					(r.name === StatisticsNames.productionSuccess ||
						r.name === StatisticsNames.productionError),
			)
			.map((r) => ({
				name: r.name,
				workflowId: r.workflowId,
				workflowName: r.workflowName,
				firstEventMs: new Date(r.firstEvent).getTime(),
			}));

		return { increments: rows[0].delta_rows, firstOccurrences };
	}

	async queryNumWorkflowsUserHasWithFiveOrMoreProdExecs(userId: User['id']): Promise<number> {
		const result = await this.createQueryBuilder('ws')
			.select('COUNT(DISTINCT ws.workflowId)', 'count')
			.innerJoin(WorkflowEntity, 'we', 'ws.workflowId = we.id')
			.innerJoin(SharedWorkflow, 'sw', 'we.id = sw.workflowId')
			.innerJoin(ProjectRelation, 'pr', 'sw.projectId = pr.projectId')
			.innerJoin(Role, 'r', 'pr.role = r.slug')
			.where('sw.role = :role', { role: 'workflow:owner' })
			.andWhere('pr.userId = :userId', { userId })
			.andWhere('r.slug = :slug', { slug: PROJECT_OWNER_ROLE_SLUG })
			.andWhere('we.activeVersionId IS NOT NULL')
			.andWhere('ws.name = :name', { name: StatisticsNames.productionSuccess })
			.andWhere('ws.count >= :minCount', { minCount: 5 })
			.getRawOne<{ count: string }>();

		return Number(result?.count ?? 0);
	}
}
