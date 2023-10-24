import type { MigrationContext, ReversibleMigration } from '@db/types';
import { TableForeignKey } from 'typeorm';

const tableName = 'folder_entity';

const foreignKey = new TableForeignKey({
	columnNames: ['folderId'],
	referencedColumnNames: ['id'],
	referencedTableName: tableName,
	onDelete: 'SET NULL',
});

export class CreateFolders1697813620896 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, addColumns, column, createForeignKey },
	}: MigrationContext) {
		await createTable(tableName)
			.withColumns(column('id').varchar(36).primary.notNull, column('name').varchar(24).notNull)
			.withTimestamps.withIndexOn('id');

		await addColumns('workflow_entity', [column('folderId').varchar(36)]);

		await createForeignKey('workflow_entity', foreignKey);
	}

	async down({ schemaBuilder: { dropTable, dropColumns, dropForeignKey } }: MigrationContext) {
		await dropTable(tableName);
		await dropColumns('workflow_entity', ['folderId']);
		await dropForeignKey('workflow_entity', foreignKey);
	}
}
