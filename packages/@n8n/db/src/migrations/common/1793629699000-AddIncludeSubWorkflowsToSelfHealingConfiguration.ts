import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIncludeSubWorkflowsToSelfHealingConfiguration1793284579000
	implements ReversibleMigration
{
	async up({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('self_healing_configuration');
		const column = escape.columnName('includeSubWorkflows');
		// Raw ALTER avoids SQLite table recreation, which would fire CASCADE on the
		// incoming FKs from the reviewer, workflow, investigation, and result tables.
		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${column} BOOLEAN NOT NULL DEFAULT FALSE`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName('self_healing_configuration');
		const column = escape.columnName('includeSubWorkflows');
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${column}`);
	}
}
