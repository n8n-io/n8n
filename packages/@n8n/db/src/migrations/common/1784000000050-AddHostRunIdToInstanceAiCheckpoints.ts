import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Durable-log RFC (resilience phase): record the host (Instance AI) run id on
 * checkpoints. The existing `runId` column holds the agent-SDK run id derived
 * from the checkpoint key; the interrupted-run sweeper needs the host run id
 * to match a crashed run's step checkpoint exactly instead of assuming the
 * thread's newest running checkpoint belongs to it.
 */
export class AddHostRunIdToInstanceAiCheckpoints1784000000050 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('instance_ai_checkpoints');
		const column = escape.columnName('hostRunId');

		await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${column} VARCHAR(64)`);

		// SQLite has no column comments.
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${column} IS 'Host (Instance AI) run id; distinct from the agent-SDK runId parsed from the checkpoint key.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('instance_ai_checkpoints');
		const column = escape.columnName('hostRunId');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${column}`);
	}
}
