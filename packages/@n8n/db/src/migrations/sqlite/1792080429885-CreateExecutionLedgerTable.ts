import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Create `execution_ledger`, an append-only buffer of execution lifecycle events, and the
 * one-row counter that versions fold batches (Postgres uses a sequence).
 */
export class CreateExecutionLedgerTable1792080429885 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const ledger = escape.tableName('execution_ledger');
		const foldSeq = escape.tableName('execution_ledger_fold_seq');

		await runQuery(
			`CREATE TABLE ${ledger} (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"event" varchar(16) NOT NULL CHECK ("event" IN ('started', 'finished')),
				"workflowId" varchar(36) NOT NULL,
				"projectId" varchar(36),
				"workflowName" varchar(128),
				"mode" varchar(32) NOT NULL,
				"status" varchar(16),
				"source" varchar(32),
				"delta" smallint NOT NULL DEFAULT 1,
				"runtimeMs" integer,
				"timeSavedMin" integer,
				"createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
			)`,
		);

		await runQuery(
			`CREATE TABLE ${foldSeq} ("id" integer PRIMARY KEY CHECK ("id" = 1), "value" integer NOT NULL)`,
		);
		await runQuery(`INSERT INTO ${foldSeq} ("id", "value") VALUES (1, 0)`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP TABLE ${escape.tableName('execution_ledger_fold_seq')}`);
		await runQuery(`DROP TABLE ${escape.tableName('execution_ledger')}`);
	}
}
