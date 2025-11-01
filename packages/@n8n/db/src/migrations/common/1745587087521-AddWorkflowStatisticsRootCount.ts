import type { ReversibleMigration, MigrationContext } from '../migration-types';

const columnName = 'rootCount';
const tableName = 'workflow_statistics';

export class AddWorkflowStatisticsRootCount1745587087521 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedColumnName} INTEGER DEFAULT 0`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedColumnName = escape.columnName(columnName);

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedColumnName}`);
	}
}
