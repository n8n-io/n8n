import type { MigrationContext, ReversibleMigration } from '@/databases/types';

const processedDataTableName = 'processed_data';

export class UpdateProcessedDataValueColumnToText1729607673464 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, dropColumns, column }, runQuery }: MigrationContext) {
		await addColumns(processedDataTableName, [column('value_temp').text.notNull]);

		await runQuery(`
		UPDATE ${processedDataTableName}
		SET value_temp = value;
	`);

		await dropColumns(processedDataTableName, ['value']);

		await addColumns(processedDataTableName, [column('value').text.notNull]);

		await runQuery(`
		UPDATE ${processedDataTableName}
		SET value = value_temp;
	`);

		await dropColumns(processedDataTableName, ['value_temp']);
	}

	async down({ schemaBuilder: { addColumns, dropColumns, column }, runQuery }: MigrationContext) {
		await addColumns(processedDataTableName, [column('value_temp').varchar(255).notNull]);

		await runQuery(`
		UPDATE ${processedDataTableName}
		SET value_temp = value;
	`);

		await dropColumns(processedDataTableName, ['value']);

		await addColumns(processedDataTableName, [column('value').varchar(255).notNull]);

		await runQuery(`
		UPDATE ${processedDataTableName}
		SET value = value_temp;
	`);

		await dropColumns(processedDataTableName, ['value_temp']);
	}
}
