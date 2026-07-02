/* eslint-disable @typescript-eslint/unbound-method */
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Append-only table for storing statistics increments that are regularly folded into
 * the `workflow_statistics`. Only for Postgres.
 */
export class CreateWorkflowStatisticsDeltaTable1784000000043 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const deltaTable = escape.tableName('workflow_statistics_delta');
		const id = escape.columnName('id');
		const workflowId = escape.columnName('workflowId');
		const name = escape.columnName('name');
		const rootCountDelta = escape.columnName('rootCountDelta');
		const latestEvent = escape.columnName('latestEvent');
		const workflowName = escape.columnName('workflowName');

		await runQuery(
			`CREATE TABLE ${deltaTable} (
				${id} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				${workflowId} VARCHAR(36) NOT NULL,
				${name} VARCHAR(128) NOT NULL,
				${rootCountDelta} SMALLINT NOT NULL,
				${latestEvent} TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
				${workflowName} VARCHAR(128)
			) WITH (
				-- This table is a high-churn buffer (insert per execution, delete on fold). 
				-- Hence we vacuum the dead tuples from the fold's deletes at a flat trigger 
				-- (not scaled with size, so it stays responsive during a backlog) and 
				-- unthrottled, so autovacuum keeps up instead of letting the table index bloat.
				autovacuum_vacuum_scale_factor = 0.0,
				autovacuum_vacuum_threshold = 1000,
				autovacuum_vacuum_cost_delay = 0
			)`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const counter = escape.tableName('workflow_statistics');
		const deltaTable = escape.tableName('workflow_statistics_delta');
		const workflowId = escape.columnName('workflowId');
		const name = escape.columnName('name');
		const count = escape.columnName('count');
		const rootCount = escape.columnName('rootCount');
		const rootCountDelta = escape.columnName('rootCountDelta');
		const latestEvent = escape.columnName('latestEvent');
		const workflowName = escape.columnName('workflowName');

		await runQuery(
			`INSERT INTO ${counter} (${workflowId}, ${name}, ${count}, ${rootCount}, ${latestEvent}, ${workflowName})
			SELECT ${workflowId}, ${name}, COUNT(*), SUM(${rootCountDelta}), MAX(${latestEvent}),
				(ARRAY_AGG(${workflowName} ORDER BY ${latestEvent} DESC NULLS LAST))[1]
			FROM ${deltaTable}
			GROUP BY ${workflowId}, ${name}
			ON CONFLICT (${name}, ${workflowId}) DO UPDATE SET
				${count} = ${counter}.${count} + EXCLUDED.${count},
				${rootCount} = ${counter}.${rootCount} + EXCLUDED.${rootCount},
				${latestEvent} = GREATEST(${counter}.${latestEvent}, EXCLUDED.${latestEvent}),
				${workflowName} = EXCLUDED.${workflowName}`,
		);

		await runQuery(`DROP TABLE ${deltaTable}`);
	}
}
