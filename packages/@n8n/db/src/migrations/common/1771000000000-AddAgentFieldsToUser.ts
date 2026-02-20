import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'user';

export class AddAgentFieldsToUser1771000000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escape.columnName('description')} VARCHAR(500) DEFAULT NULL`,
		);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escape.columnName('agentAccessLevel')} VARCHAR(20) DEFAULT NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} DROP COLUMN ${escape.columnName('agentAccessLevel')}`,
		);

		await runQuery(
			`ALTER TABLE ${escapedTableName} DROP COLUMN ${escape.columnName('description')}`,
		);
	}
}
