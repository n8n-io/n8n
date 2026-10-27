import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIncludeAllProjectMembersToSelfHealingConfiguration1793106080688
	implements ReversibleMigration
{
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('self_healing_configuration');
		const column = escape.columnName('includeAllProjectMembers');
		// Raw ALTER avoids SQLite table recreation, which would fire CASCADE on the
		// incoming FKs from the reviewer, workflow, investigation, and result tables.
		// NOT NULL DEFAULT FALSE keeps existing configurations on their explicit reviewers.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT FALSE`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('self_healing_configuration');
		const column = escape.columnName('includeAllProjectMembers');
		// Raw DROP COLUMN avoids the same recreation/CASCADE hazard as up().
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
