import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add an indexed column `deletedAt` to track soft-deleted executions.
 * Add an index on `stoppedAt`, used by executions pruning.
 */
export class ExecutionSoftDelete1693491613982 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('execution_entity', [column('deletedAt').timestamp()]);
		await createIndex('execution_entity', ['deletedAt']);
		await createIndex('execution_entity', ['stoppedAt']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['stoppedAt']);
		await dropIndex('execution_entity', ['deletedAt']);
		await dropColumns('execution_entity', ['deletedAt']);
	}
}
