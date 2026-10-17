import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds an optional name to each saved skill version. A raw ALTER TABLE, not `addColumns`:
 * `skill_file` (CASCADE) and the agent dependency tables refer to `skill_version`, and the
 * SQLite table recreate of `addColumns` would delete or block on their rows.
 */
export class AddLabelToSkillVersion1792181501257 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_version')} ADD COLUMN ${escape.columnName('label')} VARCHAR(128)`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_version')} DROP COLUMN ${escape.columnName('label')}`,
		);
	}
}
