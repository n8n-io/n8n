import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columnName = 'description';
const tableName = 'workflow_entity';

export class AddWorkflowDescriptionColumn1762177736257 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} TEXT`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
