import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columnName = 'isArchived';
const tableName = 'workflow_entity';

export class AddWorkflowArchivedColumn1745934666076 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} BOOLEAN NOT NULL DEFAULT FALSE`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
