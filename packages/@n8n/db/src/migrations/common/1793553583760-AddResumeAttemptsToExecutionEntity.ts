import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddResumeAttemptsToExecutionEntity1793553583760 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const resumeAttempts = escape.columnName('resumeAttempts');

		// Not using the addColumns DSL to avoid recreating this large table in SQLite.
		// See: https://github.com/n8n-io/n8n/blob/05c554dad53397f735003917f29eac5a5d62bdb4/.claude/plugins/n8n/skills/db-migrations/SKILL.md#sqlite-table-recreation-risk
		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${resumeAttempts} SMALLINT NOT NULL DEFAULT 0`,
		);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${tableName}.${resumeAttempts} IS 'Resume attempts since the execution last entered waiting or new. Reset to 0 once the execution runs.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('execution_entity');
		const resumeAttempts = escape.columnName('resumeAttempts');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${resumeAttempts}`);
	}
}
