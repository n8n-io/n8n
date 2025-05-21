import type { MigrationContext, ReversibleMigration } from '../migration-types';

const columnName = 'lastConnectedAt';
const tableName = 'credentials_entity';

export class AddLastConnectedAtToCredentialsEntity2025052108524 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} TIMESTAMP NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
