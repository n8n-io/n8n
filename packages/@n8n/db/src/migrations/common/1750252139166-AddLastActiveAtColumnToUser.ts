import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columnName = 'lastActiveAt';
const tableName = 'user';

export class AddLastActiveAtColumnToUser1750252139166 implements ReversibleMigration {
	async up({ escape, dbType, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		const timestampColumn =
			dbType === 'sqlite'
				? 'DATETIME NULL'
				: dbType === 'postgresdb'
					? 'TIMESTAMP NULL'
					: 'DATETIME NULL';

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} ${timestampColumn}`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
