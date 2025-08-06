import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columnName = 'lastActiveAt';
const tableName = 'user';

export class AddLastActiveAtColumnToUser1750252139166 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} DATE NULL`);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
