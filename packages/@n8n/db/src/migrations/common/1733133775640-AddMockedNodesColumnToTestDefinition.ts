import type { MigrationContext, ReversibleMigration } from '../migration-types';

// We have to use raw query migration instead of schemaBuilder helpers,
// because the typeorm schema builder implements addColumns by a table recreate for sqlite
// which causes weird issues with the migration
export class AddMockedNodesColumnToTestDefinition1733133775640 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_definition');
		const mockedNodesColumnName = escape.columnName('mockedNodes');

		await runQuery(
			`ALTER TABLE ${tableName} ADD COLUMN ${mockedNodesColumnName} JSON DEFAULT ('[]') NOT NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const tableName = escape.tableName('test_definition');
		const columnName = escape.columnName('mockedNodes');

		await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
	}
}
