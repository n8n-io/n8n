import type { MigrationContext, ReversibleMigration } from '@/databases/types';

const processedDataTableName = 'processed_data';
export class UpdateProcessedDataValueColumnToText1729607673464 implements ReversibleMigration {
	async up({
		schemaBuilder: { addNotNull, addColumns, dropColumns, column },
		runQuery,
		tablePrefix,
	}: MigrationContext) {
		const prefixedTableName = `${tablePrefix}${processedDataTableName}`;

		await addColumns(processedDataTableName, [column('value_temp').text]);

		await runQuery(`
		UPDATE ${prefixedTableName}
		SET value_temp = value;
	`);

		await dropColumns(processedDataTableName, ['value']);
		await runQuery(`ALTER TABLE ${prefixedTableName} RENAME COLUMN value_temp TO value`);
		await addNotNull(processedDataTableName, 'value');
	}

	async down({
		schemaBuilder: { addNotNull, addColumns, dropColumns, column },
		runQuery,
		tablePrefix,
	}: MigrationContext) {
		const prefixedTableName = `${tablePrefix}${processedDataTableName}`;

		await addColumns(processedDataTableName, [column('value_temp').varchar(255)]);

		await runQuery(`
		UPDATE ${prefixedTableName}
		SET value_temp = value;
	`);

		await dropColumns(processedDataTableName, ['value']);
		await runQuery(`ALTER TABLE ${prefixedTableName} RENAME COLUMN value_temp TO value`);
		await addNotNull(processedDataTableName, 'value');
	}
}
