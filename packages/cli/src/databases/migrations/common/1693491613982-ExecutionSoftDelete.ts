import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class ExecutionSoftDelete1693491613982 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, createIndex },
		queryRunner,
		escape,
	}: MigrationContext) {
		await addColumns('execution_entity', [
			column('createdAt').timestamp().notNull.default('NOW()'),
			column('deletedAt').timestamp(),
		]);
		await createIndex('execution_entity', ['deletedAt']);
		await createIndex('execution_entity', ['stoppedAt']);

		await queryRunner.query(
			`UPDATE ${escape.tableName('execution_entity')} SET ${escape.columnName(
				'createdAt',
			)} = ${escape.columnName('startedAt')};`,
		);
		// TODO: make `startedAt` nullable, and set it only after the execution actually starts
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['stoppedAt']);
		await dropIndex('execution_entity', ['deletedAt']);
		await dropColumns('execution_entity', ['createdAt', 'deletedAt']);
	}
}
