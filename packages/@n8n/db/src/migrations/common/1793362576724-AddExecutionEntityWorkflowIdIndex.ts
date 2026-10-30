import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Index `workflowId` on its own, for the foreign key cascade from `workflow_entity`
 * and for lookups that include soft-deleted rows. The partial indexes on
 * `workflowId` cover only live rows.
 */
export class AddExecutionEntityWorkflowIdIndex1793353882390 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('execution_entity', ['workflowId']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['workflowId']);
	}
}
