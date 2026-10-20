/* eslint-disable @typescript-eslint/unbound-method */
import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Create `execution_ledger`, an append-only buffer of execution lifecycle events.
 * A periodic fold deletes rows in batches and hands them to the registered participants.
 * The autovacuum settings match `workflow_statistics_delta`, which has the same churn.
 */
export class CreateExecutionLedgerTable1792080429885 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const ledger = escape.tableName('execution_ledger');
		const id = escape.columnName('id');
		const event = escape.columnName('event');
		const workflowId = escape.columnName('workflowId');
		const projectId = escape.columnName('projectId');
		const workflowName = escape.columnName('workflowName');
		const mode = escape.columnName('mode');
		const status = escape.columnName('status');
		const source = escape.columnName('source');
		const delta = escape.columnName('delta');
		const runtimeMs = escape.columnName('runtimeMs');
		const timeSavedMin = escape.columnName('timeSavedMin');
		const createdAt = escape.columnName('createdAt');

		await runQuery(
			`CREATE TABLE ${ledger} (
				${id} BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
				${event} VARCHAR(16) NOT NULL CHECK (${event} IN ('started', 'finished')),
				${workflowId} VARCHAR(36) NOT NULL,
				${projectId} VARCHAR(36),
				${workflowName} VARCHAR(128),
				${mode} VARCHAR(32) NOT NULL,
				${status} VARCHAR(16),
				${source} VARCHAR(32),
				${delta} SMALLINT NOT NULL DEFAULT 1,
				${runtimeMs} INT,
				${timeSavedMin} INT,
				${createdAt} TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
			) WITH (
				autovacuum_vacuum_scale_factor = 0.0,
				autovacuum_vacuum_threshold = 1000,
				autovacuum_vacuum_cost_delay = 0
			)`,
		);

		await runQuery(
			`COMMENT ON COLUMN ${ledger}.${event} IS 'started: counted at admission; finished: completed run outcome'`,
		);
		await runQuery(
			`COMMENT ON COLUMN ${ledger}.${delta} IS '+1 for an event, -1 to compensate a refused admission'`,
		);

		// Orders fold batches, so a cache can ignore a late write from an older fold.
		await runQuery(`CREATE SEQUENCE ${escape.tableName('execution_ledger_fold_seq')}`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP SEQUENCE ${escape.tableName('execution_ledger_fold_seq')}`);
		await runQuery(`DROP TABLE ${escape.tableName('execution_ledger')}`);
	}
}
