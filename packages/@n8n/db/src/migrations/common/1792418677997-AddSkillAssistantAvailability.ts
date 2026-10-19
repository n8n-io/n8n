import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSkillAssistantAvailability1792418677997 implements ReversibleMigration {
	async up({ runQuery, escape }: MigrationContext) {
		// ALTER preserves the skill versions and references on SQLite.
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill')} ADD COLUMN ${escape.columnName('availableToAssistant')} boolean NOT NULL DEFAULT false`,
		);
	}

	async down({ runQuery, escape }: MigrationContext) {
		await runQuery(
			`ALTER TABLE ${escape.tableName('skill')} DROP COLUMN ${escape.columnName('availableToAssistant')}`,
		);
	}
}
