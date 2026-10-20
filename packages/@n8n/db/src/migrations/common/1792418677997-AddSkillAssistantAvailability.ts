import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillAssistantAvailability1792418677997 implements ReversibleMigration {
	async up({ runQuery, escape, isPostgres }: MigrationContext) {
		const table = escape.tableName('skill');
		const column = escape.columnName('availableToAssistant');

		// ALTER preserves the skill versions and references on SQLite.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} boolean NOT NULL DEFAULT false`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${column} IS 'Whether a user has enabled this skill for the n8n Assistant. Scope and permissions still apply.'`,
			);
		}
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill')} DROP COLUMN ${escape.columnName('availableToAssistant')}`,
		);
	}
}
