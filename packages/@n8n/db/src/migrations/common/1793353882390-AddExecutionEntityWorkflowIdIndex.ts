import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Index `execution_entity.workflowId` on its own. The 2024 index refactor dropped
 * the only index that started with `workflowId` and had no partial condition, so
 * the foreign key cascade from `workflow_entity` and the batch lookup in
 * `hardDeleteByWorkflowId`, which include soft-deleted rows, scanned the whole
 * table on every workflow deletion.
 */
export class AddExecutionEntityWorkflowIdIndex1793353882390 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('execution_entity', ['workflowId']);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('execution_entity', ['workflowId']);
	}
}
