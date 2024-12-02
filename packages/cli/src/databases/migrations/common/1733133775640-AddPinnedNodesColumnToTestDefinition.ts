import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddPinnedNodesColumnToTestDefinition1733133775640 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, escape }: MigrationContext) {
		// We have to use raw query migration instead of schemaBuilder helpers,
		// because the typeorm schema builder implements addColumns by a table recreate for sqlite
		// which causes weird issues with the migration
		const pinnedNodesColumnName = escape.columnName('pinnedNodes');

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}test_definition ADD COLUMN ${pinnedNodesColumnName} JSON DEFAULT '[]' NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('test_definition', ['pinnedNodes']);
	}
}
