import type { MigrationContext, ReversibleMigration } from '../migration-types';

const processedDataTableName = 'processed_data';
export class UpdateProcessedDataValueColumnToText1729607673464 implements ReversibleMigration {
	async up({ schemaBuilder: { addNotNull }, isMysql, runQuery, tablePrefix }: MigrationContext) {
		const prefixedTableName = `${tablePrefix}${processedDataTableName}`;
		await runQuery(`ALTER TABLE ${prefixedTableName} ADD COLUMN value_temp TEXT;`);
		await runQuery(`UPDATE ${prefixedTableName} SET value_temp = value;`);
		await runQuery(`ALTER TABLE ${prefixedTableName} DROP COLUMN value;`);

		if (isMysql) {
			await runQuery(`ALTER TABLE ${prefixedTableName} CHANGE value_temp value TEXT NOT NULL;`);
		} else {
			await runQuery(`ALTER TABLE ${prefixedTableName} RENAME COLUMN value_temp TO value`);
			await addNotNull(processedDataTableName, 'value');
		}
	}

	async down({ schemaBuilder: { addNotNull }, isMysql, runQuery, tablePrefix }: MigrationContext) {
		const prefixedTableName = `${tablePrefix}${processedDataTableName}`;
		await runQuery(`ALTER TABLE ${prefixedTableName} ADD COLUMN value_temp VARCHAR(255);`);
		await runQuery(`UPDATE ${prefixedTableName} SET value_temp = value;`);
		await runQuery(`ALTER TABLE ${prefixedTableName} DROP COLUMN value;`);

		if (isMysql) {
			await runQuery(
				`ALTER TABLE ${prefixedTableName} CHANGE value_temp value VARCHAR(255) NOT NULL;`,
			);
		} else {
			await runQuery(`ALTER TABLE ${prefixedTableName} RENAME COLUMN value_temp TO value`);
			await addNotNull(processedDataTableName, 'value');
		}
	}
}
