import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add an indexed column `parentExecutionId` to link sub-executions to their parent execution.
 * This replaces the previous LIKE-based search on execution data with a direct foreign key relationship.
 */
export class AddParentExecutionIdToExecutionEntity1766063773000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('execution_entity', [
			column('parentExecutionId').int.comment(
				'ID of the parent execution if this is a subworkflow (mode=integrated)',
			),
		]);
		await createIndex('execution_entity', ['parentExecutionId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['parentExecutionId']);
		await dropColumns('execution_entity', ['parentExecutionId']);
	}
}
