import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillSourceUnlinkedSkills1795005085247 implements ReversibleMigration {
	async up({ escape, runQuery, isPostgres }: MigrationContext) {
		// ADD COLUMN keeps the incoming skill links on SQLite.
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source')} ADD COLUMN ${escape.columnName('unlinkedSkills')} ${isPostgres ? 'JSON' : 'TEXT'}`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('skill_source')}.${escape.columnName('unlinkedSkills')} IS 'Unlinked skill keys, content hashes, verdicts, and skipped flags. No content.'`,
			);
		}
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill_source')} DROP COLUMN ${escape.columnName('unlinkedSkills')}`,
		);
	}
}
