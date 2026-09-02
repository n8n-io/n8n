/* eslint-disable @typescript-eslint/unbound-method */
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Create `workflow_statistics_delta` to store increments to workflow statistics
 * that we will later fold into the `workflow_statistics`. This prevents hot-row
 * contention on the `workflow_statistics` table in high-throughput scenarios.
 *
 * This table is a high-churn buffer (insert per execution, delete on fold), so
 * its autovacuum is tuned to reclaim the fold's dead tuples aggressively
 * instead of letting the table and its PK index bloat.
 *
 * - `scale_factor = 0` removes the size-proportional part of the vacuum trigger,
 *   so dead-tuple cleanup does not back off as the table grows during a backlog.
 * - `threshold = 1000` fires a vacuum at a flat 1000 dead tuples regardless of
 *   table size, keeping it responsive.
 * - `cost_delay = 0` drops autovacuum's throttling pauses so it runs at full
 *   speed and keeps up with the delete rate.
 */
export class CreateWorkflowStatisticsDeltaTable1784000000043 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const delta = escape.tableName('workflow_statistics_delta');
		const id = escape.columnName('id');
		const workflowId = escape.columnName('workflowId');
		const name = escape.columnName('name');
		const rootCountDelta = escape.columnName('rootCountDelta');
		const createdAt = escape.columnName('createdAt');
		const workflowName = escape.columnName('workflowName');

		await runQuery(
			`CREATE TABLE ${delta} (
				${id} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				${workflowId} VARCHAR(36) NOT NULL,
				${name} VARCHAR(128) NOT NULL,
				${rootCountDelta} SMALLINT NOT NULL,
				${createdAt} TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
				${workflowName} VARCHAR(128)
			) WITH (
				autovacuum_vacuum_scale_factor = 0.0,
				autovacuum_vacuum_threshold = 1000,
				autovacuum_vacuum_cost_delay = 0
			)`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const stats = escape.tableName('workflow_statistics');
		const statsDelta = escape.tableName('workflow_statistics_delta');
		const workflowId = escape.columnName('workflowId');
		const name = escape.columnName('name');
		const count = escape.columnName('count');
		const rootCount = escape.columnName('rootCount');
		const rootCountDelta = escape.columnName('rootCountDelta');
		const latestEvent = escape.columnName('latestEvent');
		const createdAt = escape.columnName('createdAt');
		const workflowName = escape.columnName('workflowName');

		await runQuery(
			`INSERT INTO ${stats} (${workflowId}, ${name}, ${count}, ${rootCount}, ${latestEvent}, ${workflowName})
			SELECT ${workflowId}, ${name}, COUNT(*), SUM(${rootCountDelta}), MAX(${createdAt}),
				(ARRAY_AGG(${workflowName} ORDER BY ${createdAt} DESC NULLS LAST))[1]
			FROM ${statsDelta}
			GROUP BY ${workflowId}, ${name}
			ON CONFLICT (${name}, ${workflowId}) DO UPDATE SET
				${count} = ${stats}.${count} + EXCLUDED.${count},
				${rootCount} = ${stats}.${rootCount} + EXCLUDED.${rootCount},
				${latestEvent} = GREATEST(${stats}.${latestEvent}, EXCLUDED.${latestEvent}),
				${workflowName} = EXCLUDED.${workflowName}`,
		);

		await runQuery(`DROP TABLE ${statsDelta}`);
	}
}
