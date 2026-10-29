import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddResumeAttemptsToExecutionEntity1793282162307 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const resumeAttempts = escape.columnName('resumeAttempts');

		// Not using the addColumns DSL to avoid recreating this large table in SQLite.
		// See: https://github.com/n8n-io/n8n/blob/05c554dad53397f735003917f29eac5a5d62bdb4/.claude/plugins/n8n/skills/db-migrations/SKILL.md#sqlite-table-recreation-risk
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${resumeAttempts} SMALLINT NOT NULL DEFAULT 0`,
		);

		// SQLite has no column comments, so annotate only on Postgres.
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${resumeAttempts} IS 'How many times n8n has loaded this execution into memory to resume it from waiting or to start it from new since it last entered that status. Reset to 0 when the execution starts running.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const resumeAttempts = escape.columnName('resumeAttempts');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${resumeAttempts}`);
	}
}
