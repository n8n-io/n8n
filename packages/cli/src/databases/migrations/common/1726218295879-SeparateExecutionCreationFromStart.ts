import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class SeparateExecutionCreationFromStart1726218295879 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, dropNotNull },
		runQuery,
		escape,
		runInBatches,
	}: MigrationContext) {
		await addColumns('execution_entity', [
			column('createdAt').notNull.timestamp().default('NOW()'),
		]);

		await dropNotNull('execution_entity', 'startedAt');

		const executionEntity = escape.tableName('execution_entity');
		const createdAt = escape.columnName('createdAt');
		const startedAt = escape.columnName('startedAt');
		const id = escape.columnName('id');

		const BATCH_SIZE = 500;

		await runInBatches(
			`SELECT ${id} FROM ${executionEntity}`,
			async (batch: Array<{ id: string }>) => {
				const ids = batch.map((row) => row.id).join(',');
				await runQuery(`
          UPDATE ${executionEntity}
          SET ${createdAt} = ${startedAt}
          WHERE ${id} IN (${ids});
        `);
			},
			BATCH_SIZE,
		);
	}

	async down({ schemaBuilder: { dropColumns, addNotNull } }: MigrationContext) {
		await dropColumns('execution_entity', ['createdAt']);
		await addNotNull('execution_entity', 'startedAt');
	}
}
