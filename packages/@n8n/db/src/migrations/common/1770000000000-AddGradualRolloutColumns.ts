import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_entity';

export class AddGradualRolloutColumns1770000000000 implements ReversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedRolloutVersionId = escape.columnName('gradualRolloutVersionId');
		const escapedRolloutPercentage = escape.columnName('gradualRolloutPercentage');

		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedRolloutVersionId} VARCHAR(36) NULL`,
		);
		await runQuery(
			`ALTER TABLE ${escapedTableName} ADD COLUMN ${escapedRolloutPercentage} SMALLINT NULL`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const escapedTableName = escape.tableName(tableName);
		const escapedRolloutVersionId = escape.columnName('gradualRolloutVersionId');
		const escapedRolloutPercentage = escape.columnName('gradualRolloutPercentage');

		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedRolloutVersionId}`);
		await runQuery(`ALTER TABLE ${escapedTableName} DROP COLUMN ${escapedRolloutPercentage}`);
	}
}
