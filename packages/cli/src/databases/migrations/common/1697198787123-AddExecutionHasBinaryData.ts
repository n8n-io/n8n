import type { MigrationContext, ReversibleMigration } from '@db/types';

const tableName = 'execution_entity';

export class AddExecutionHasBinaryData1697198787123 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(tableName, [column('hasBinaryData').bool.default(false)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, ['hasBinaryData']);
	}
}
